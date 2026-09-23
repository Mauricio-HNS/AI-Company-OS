import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { MASTER_EMAIL, MASTER_PASSWORD } from "./config/env.js";
import { db } from "./db/index.js";
import { auth, master, sign } from "./auth/index.js";
import { audit } from "./audit/index.js";
import { provisionWorkforce } from "./workforce/index.js";
import { supportRouter } from "./support/index.js";
import { erpRouter } from "./erp/index.js";
import { executeMission, executePlan } from "./missions/engine.js";
import { ensureOrchestrator, seedCapabilities, analyzeCompany, runSuperAgent } from "./super-agent/index.js";
import { now, id, hashToken, safeJson } from "./core/utils.js";
import { enqueueJob, getJob, listJobs } from "./jobs/queue.js";
import { requestPasswordReset, confirmPasswordReset, inspectResetToken } from "./auth/password-reset.js";

const app = express();

app.use(cors({ origin:true, credentials:false }));
app.disable("x-powered-by");
app.use((req,res,next)=>{
  const requestId=req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId=String(requestId);
  res.setHeader("x-request-id",req.requestId);
  next();
});
app.use(express.json({limit:"2mb"}));

app.get("/api/health", (_req,res)=>res.json({ok:true,service:"ai-company-os-server",time:now()}));
app.get("/api/master/jobs",master,(req,res)=>res.json(listJobs(req.query.companyId || null, req.query.limit)));
app.post("/api/auth/password-reset/request", async (req,res)=>{
  try {
    const role = req.body?.portal === "master" ? "MASTER" : "CLIENT";
    const result = await requestPasswordReset({ email:req.body?.email, role, ip:req.ip });
    res.status(200).json(result);
  } catch {
    res.status(200).json({
      message:"Se esse endereço estiver cadastrado, enviaremos um link para redefinir a senha."
    });
  }
});

app.get("/api/auth/password-reset/verify", (req,res)=>{
  res.json(inspectResetToken(req.query?.token));
});

app.post("/api/auth/password-reset/confirm", async (req,res)=>{
  try {
    const result = await confirmPasswordReset({
      token:req.body?.token,
      newPassword:req.body?.newPassword
    });
    if (!result.ok) return res.status(result.status).json({error:result.error});
    res.json({ok:true,message:"Senha redefinida. Entre novamente com sua nova senha."});
  } catch {
    res.status(400).json({error:"INVALID_OR_EXPIRED_RESET_TOKEN"});
  }
});

app.get("/api/master/jobs/:id",master,(req,res)=>{
  const job=getJob(req.params.id);
  if(!job) return res.status(404).json({error:"JOB_NOT_FOUND"});
  res.json(job);
});

app.post("/api/auth/master", async (req,res)=>{
  const {email,password}=req.body||{};
  if(email!==MASTER_EMAIL || typeof password!=="string") return res.status(401).json({error:"INVALID_CREDENTIALS"});
  let u=db.prepare("SELECT * FROM users WHERE email=? AND role='MASTER'").get(MASTER_EMAIL);
  if(!u) {
    const t=now(), hash=await bcrypt.hash(MASTER_PASSWORD,12);
    u={id:id(),company_id:null,name:"Master Administrator",email:MASTER_EMAIL,password_hash:hash,role:"MASTER",active:1,token_version:0,created_at:t};
    db.prepare("INSERT INTO users (id,company_id,name,email,password_hash,role,active,token_version,created_at) VALUES (?,?,?,?,?,?,?,?,?)").run(u.id,null,u.name,u.email,u.password_hash,u.role,1,0,t);
  }
  if(!u.active || !(await bcrypt.compare(password,u.password_hash))) return res.status(401).json({error:"INVALID_CREDENTIALS"});
  audit(u.id,"MASTER_LOGIN","user",u.id);
  res.json({token:sign(u),user:{id:u.id,name:u.name,email:u.email,role:u.role}});
});

app.post("/api/auth/client/signup", async (req,res)=>{
  const {inviteToken,name,email,password}=req.body||{};
  if(!inviteToken||!name||!email||!password||password.length<10) return res.status(400).json({error:"INVALID_INPUT"});
  const inv=db.prepare("SELECT * FROM invites WHERE token_hash=?").get(hashToken(inviteToken));
  if(!inv || inv.revoked_at || (inv.expires_at && inv.expires_at < now())) return res.status(400).json({error:"INVALID_OR_EXPIRED_INVITE"});
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(inv.company_id);
  if(!company || company.status==="CONGELADA" || company.status==="ENCERRADA") return res.status(403).json({error:"COMPANY_ACCESS_BLOCKED"});
  if(db.prepare("SELECT id FROM users WHERE email=?").get(email)) return res.status(409).json({error:"EMAIL_ALREADY_EXISTS"});
  const u={id:id(),company_id:company.id,name,email,password_hash:await bcrypt.hash(password,12),role:"CLIENT",active:1,created_at:now()};
  db.prepare("INSERT INTO users (id,company_id,name,email,password_hash,role,active,token_version,created_at) VALUES (?,?,?,?,?,?,?,?,?)").run(u.id,u.company_id,u.name,u.email,u.password_hash,u.role,1,0,u.created_at);
  audit(u.id,"CLIENT_SIGNUP","company",company.id);
  res.json({token:sign(u),user:{id:u.id,name:u.name,email:u.email,role:u.role},company});
});

app.post("/api/auth/client/login", async (req,res)=>{
  const {email,password}=req.body||{};
  const u=db.prepare("SELECT * FROM users WHERE email=? AND role='CLIENT'").get(email);
  if(!u || !u.active || !(await bcrypt.compare(password,u.password_hash))) return res.status(401).json({error:"INVALID_CREDENTIALS"});
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(u.company_id);
  if(!company || ["CONGELADA","ENCERRADA","SUSPENSA"].includes(company.status)) return res.status(403).json({error:"COMPANY_ACCESS_BLOCKED"});
  res.json({token:sign(u),user:{id:u.id,name:u.name,email:u.email,role:u.role},company});
});

app.get("/api/me",auth,(req,res)=>{
  const u=db.prepare("SELECT id,name,email,role,company_id FROM users WHERE id=?").get(req.user.sub);
  if(!u) return res.status(404).json({error:"USER_NOT_FOUND"});
  const company=u.company_id?db.prepare("SELECT * FROM companies WHERE id=?").get(u.company_id):null;
  res.json({user:u,company});
});

app.get("/api/master/companies",master,(_req,res)=>{
  res.json(db.prepare("SELECT * FROM companies ORDER BY created_at DESC").all());
});

app.post("/api/master/companies",master,(req,res)=>{
  const {name,type="",country="",revenue=0}=req.body||{};
  if(!name?.trim()) return res.status(400).json({error:"NAME_REQUIRED"});
  const t=now(), c={id:id(),name:name.trim(),type,country,status:"ACTIVE",revenue:Number(revenue)||0,created_at:t,updated_at:t};
  db.prepare("INSERT INTO companies VALUES (?,?,?,?,?,?,?,?)").run(c.id,c.name,c.type,c.country,c.status,c.revenue,c.created_at,c.updated_at);
  provisionWorkforce(c.id,req.user.sub);
  audit(req.user.sub,"COMPANY_CREATED","company",c.id,c);
  res.status(201).json(c);
});

app.patch("/api/master/companies/:id",master,(req,res)=>{
  const c=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!c)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const allowed=["ACTIVE","EM_IMPLANTACAO","PAGAMENTO_PENDENTE","INADIMPLENTE","SUSPENSA","CONGELADA","ENCERRADA","ARQUIVADA"];
  const status=req.body?.status;
  if(status && !allowed.includes(status)) return res.status(400).json({error:"INVALID_STATUS"});
  const next={...c,...req.body,updated_at:now()};
  db.prepare("UPDATE companies SET name=?,type=?,country=?,status=?,revenue=?,updated_at=? WHERE id=?").run(next.name,next.type,next.country,next.status,Number(next.revenue)||0,next.updated_at,c.id);
  audit(req.user.sub,"COMPANY_UPDATED","company",c.id,{before:c,after:next});
  res.json(next);
});

app.post("/api/master/companies/:id/invites",master,(req,res)=>{
  const c=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!c)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  db.prepare("UPDATE invites SET revoked_at=? WHERE company_id=? AND revoked_at IS NULL").run(now(),c.id);
  const token=crypto.randomBytes(32).toString("hex"), t=now();
  db.prepare("INSERT INTO invites VALUES (?,?,?,?,?,?)").run(id(),c.id,hashToken(token),null,null,t);
  audit(req.user.sub,"INVITE_CREATED","company",c.id);
  res.status(201).json({token,company:c.id,createdAt:t});
});

app.delete("/api/master/companies/:id",master,(req,res)=>{
  return res.status(409).json({error:"HARD_DELETE_DISABLED",message:"Use status ARQUIVADA or ENCERRADA. Histórico financeiro, suporte e auditoria devem ser preservados."});
});

app.get("/api/master/workforce",master,(_req,res)=>{
  const rows=db.prepare("SELECT a.*,c.name company_name FROM ai_agents a JOIN companies c ON c.id=a.company_id ORDER BY c.name,a.department,a.created_at").all();
  res.json(rows);
});
app.get("/api/master/companies/:id/workforce",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  res.json(db.prepare("SELECT * FROM ai_agents WHERE company_id=? ORDER BY department,created_at").all(company.id));
});
app.post("/api/master/companies/:id/workforce/provision",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const created=provisionWorkforce(company.id,req.user.sub);
  res.json({company,created,agents:db.prepare("SELECT * FROM ai_agents WHERE company_id=? ORDER BY department,created_at").all(company.id)});
});
app.post("/api/master/agents",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.body?.companyId);
  const name=String(req.body?.name||"").trim(), role=String(req.body?.role||"").trim();
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  if(!name||!role)return res.status(400).json({error:"NAME_AND_ROLE_REQUIRED"});
  const t=now(),a={id:id(),company_id:company.id,name,role,department:req.body?.department||"GENERAL",description:req.body?.description||"",autonomy:req.body?.autonomy||"OPERATIONAL",status:"READY",source:"MANUAL",permissions:JSON.stringify(req.body?.permissions||[]),tools:JSON.stringify(req.body?.tools||[]),goals:JSON.stringify(req.body?.goals||[]),kpis:JSON.stringify(req.body?.kpis||[]),supervisor_id:req.body?.supervisorId||null,created_at:t,updated_at:t};
  db.prepare("INSERT INTO ai_agents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(a));
  audit(req.user.sub,"AGENT_CREATED","ai_agent",a.id,a);
  res.status(201).json(a);
});
app.patch("/api/master/agents/:id",master,(req,res)=>{
  const a=db.prepare("SELECT * FROM ai_agents WHERE id=?").get(req.params.id);
  if(!a)return res.status(404).json({error:"AGENT_NOT_FOUND"});
  const n={...a,...req.body,updated_at:now()};
  db.prepare("UPDATE ai_agents SET name=?,role=?,department=?,description=?,autonomy=?,status=?,permissions=?,tools=?,goals=?,kpis=?,supervisor_id=?,updated_at=? WHERE id=?").run(n.name,n.role,n.department,n.description,n.autonomy,n.status,n.permissions?.constructor===String?n.permissions:JSON.stringify(n.permissions||[]),n.tools?.constructor===String?n.tools:JSON.stringify(n.tools||[]),n.goals?.constructor===String?n.goals:JSON.stringify(n.goals||[]),n.kpis?.constructor===String?n.kpis:JSON.stringify(n.kpis||[]),n.supervisor_id||null,n.updated_at,a.id);
  audit(req.user.sub,"AGENT_UPDATED","ai_agent",a.id,{before:a,after:n});
  res.json(db.prepare("SELECT * FROM ai_agents WHERE id=?").get(a.id));
});
app.delete("/api/master/agents/:id",master,(req,res)=>{
  const a=db.prepare("SELECT * FROM ai_agents WHERE id=?").get(req.params.id);
  if(!a)return res.status(404).json({error:"AGENT_NOT_FOUND"});
  db.prepare("UPDATE ai_agents SET status='DISABLED',updated_at=? WHERE id=?").run(now(),a.id);
  audit(req.user.sub,"AGENT_DISABLED","ai_agent",a.id);
  res.json({ok:true});
});


app.post("/api/master/plans/:id/execute",master,(req,res)=>{
  const plan=db.prepare("SELECT * FROM ai_plans WHERE id=?").get(req.params.id);
  if(!plan)return res.status(404).json({error:"PLAN_NOT_FOUND"});
  const job=enqueueJob("PLAN_EXECUTION",{planId:plan.id,actorId:req.user.sub},{companyId:plan.company_id,priority:10});
  res.status(202).json({queued:true,job});
});
app.get("/api/master/companies/:id/super-agent",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const orchestrator=ensureOrchestrator(company.id);
  const plan=db.prepare("SELECT * FROM ai_plans WHERE company_id=? ORDER BY created_at DESC LIMIT 1").get(company.id);
  const steps=plan?db.prepare("SELECT s.*,c.name capability_name FROM ai_plan_steps s LEFT JOIN ai_capabilities c ON c.key=s.capability_key WHERE s.plan_id=? ORDER BY s.step_order").all(plan.id):[];
  res.json({company,orchestrator,plan:plan||null,steps});
});
app.post("/api/master/companies/:id/super-agent/analyze",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  provisionWorkforce(company.id,req.user.sub);
  res.json(analyzeCompany(company.id,req.user.sub));
});
app.get("/api/master/companies/:id/super-agent/plans",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const plans=db.prepare("SELECT * FROM ai_plans WHERE company_id=? ORDER BY created_at DESC").all(company.id);
  res.json(plans.map(p=>({...p,detected_needs:safeJson(p.detected_needs)})));
});
app.get("/api/master/companies/:id/crm",master,(req,res)=>{
  const company=db.prepare("SELECT id FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  res.json({
    customers:db.prepare("SELECT * FROM crm_customers WHERE company_id=? ORDER BY created_at DESC").all(company.id),
    leads:db.prepare("SELECT * FROM crm_leads WHERE company_id=? ORDER BY created_at DESC").all(company.id),
    opportunities:db.prepare("SELECT * FROM crm_opportunities WHERE company_id=? ORDER BY created_at DESC").all(company.id)
  });
});
app.post("/api/master/missions/:id/execute",master,(req,res)=>{
  const mission=db.prepare("SELECT * FROM ai_missions WHERE id=?").get(req.params.id);
  if(!mission)return res.status(404).json({error:"MISSION_NOT_FOUND"});
  const job=enqueueJob("MISSION_EXECUTION",{missionId:mission.id,actorId:req.user.sub},{companyId:mission.company_id,priority:20});
  res.status(202).json({queued:true,job});
});
app.post("/api/master/companies/:id/super-agent/run",master,(req,res)=>{
  const company=db.prepare("SELECT id FROM companies WHERE id=?").get(req.params.id);
  if(!company) return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  provisionWorkforce(company.id,req.user.sub);
  res.json(runSuperAgent(company.id,req.user.sub,req.body?.maxCycles));
});
app.get("/api/master/companies/:id/missions",master,(req,res)=>{
  const company=db.prepare("SELECT id FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const missions=db.prepare("SELECT m.*,a.name assigned_agent_name FROM ai_missions m LEFT JOIN ai_agents a ON a.id=m.assigned_agent_id WHERE m.company_id=? ORDER BY m.created_at DESC").all(company.id);
  res.json(missions);
});
app.get("/api/master/companies/:id/executions",master,(req,res)=>{
  const company=db.prepare("SELECT id FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const runs=db.prepare("SELECT e.*,s.title step_title,c.name capability_name FROM ai_execution_runs e LEFT JOIN ai_plan_steps s ON s.id=e.plan_step_id LEFT JOIN ai_capabilities c ON c.key=e.capability_key WHERE e.company_id=? ORDER BY e.started_at DESC LIMIT 200").all(company.id);
  res.json(runs);
});
app.get("/api/master/policies",master,(_req,res)=>{
  seedCapabilities();
  res.json(db.prepare("SELECT p.*,c.name capability_name FROM ai_policies p LEFT JOIN ai_capabilities c ON c.key=p.capability_key ORDER BY p.company_id,p.capability_key").all());
});
app.post("/api/master/policies",master,(req,res)=>{
  const capability=String(req.body?.capabilityKey||"");
  const effect=String(req.body?.effect||"ESCALATE");
  if(!["ALLOW","ESCALATE","BLOCK"].includes(effect)) return res.status(400).json({error:"INVALID_POLICY_EFFECT"});
  if(!db.prepare("SELECT 1 FROM ai_capabilities WHERE key=? AND active=1").get(capability)) return res.status(404).json({error:"CAPABILITY_NOT_FOUND"});
  const companyId=req.body?.companyId||null;
  if(companyId && !db.prepare("SELECT 1 FROM companies WHERE id=?").get(companyId)) return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const existing=db.prepare("SELECT id FROM ai_policies WHERE ((company_id=? AND ? IS NOT NULL) OR (company_id IS NULL AND ? IS NULL)) AND capability_key=? LIMIT 1").get(companyId,companyId,companyId,capability);
  const t=now();
  if(existing) db.prepare("UPDATE ai_policies SET effect=?,reason=?,updated_at=? WHERE id=?").run(effect,String(req.body?.reason||""),t,existing.id);
  else db.prepare("INSERT INTO ai_policies VALUES (?,?,?,?,?,?,?)").run(id(),companyId,capability,effect,String(req.body?.reason||""),t,t);
  audit(req.user.sub,"AI_POLICY_UPDATED","ai_policy",existing?.id||null,{companyId,capability,effect});
  res.json(db.prepare("SELECT p.*,c.name capability_name FROM ai_policies p LEFT JOIN ai_capabilities c ON c.key=p.capability_key WHERE p.company_id IS ? AND p.capability_key=? ORDER BY p.updated_at DESC LIMIT 1").get(companyId,capability));
});
app.get("/api/master/capabilities",master,(_req,res)=>{
  seedCapabilities();
  res.json(db.prepare("SELECT * FROM ai_capabilities WHERE active=1 ORDER BY domain,name").all());
});

app.use(supportRouter);
app.use(erpRouter);

app.get("/api/master/audit",master,(_req,res)=>res.json(db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500").all()));

app.use((err,req,res,_next)=>{
  const status=Number(err?.statusCode || err?.status || 500);
  const code=err?.code || (status===500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR");
  if(status>=500) console.error("AIOS_REQUEST_ERROR", { requestId:req.requestId, error:err?.message });
  res.status(status).json({ error:code, requestId:req.requestId });
});

const seed=db.prepare("SELECT COUNT(*) n FROM companies").get().n;
if(!db.prepare("SELECT COUNT(*) n FROM products").get().n) {
  const t=now();
  for(const p of [{name:"AI Company OS — Core",description:"Ambiente operacional empresarial",type:"SERVICE",price:499,billing_cycle:"MONTHLY"},{name:"AI Support",description:"Suporte e operação assistida por IA",type:"SERVICE",price:149,billing_cycle:"MONTHLY"}]) db.prepare("INSERT INTO products VALUES (?,?,?,?,?,?,?,?)").run(id(),p.name,p.description,p.type,p.price,p.billing_cycle,1,t);
}
if(!seed) {
  const t=now();
  for(const c of [
    {id:"destiny7-software",name:"Destiny7 Software",type:"SaaS",country:"Spain",revenue:82400},
    {id:"novaflow",name:"NovaFlow",type:"Automation",country:"Portugal",revenue:61800}
  ]) {
    db.prepare("INSERT INTO companies VALUES (?,?,?,?,?,?,?,?)").run(c.id,c.name,c.type,c.country,"ACTIVE",c.revenue,t,t);
    provisionWorkforce(c.id,null);
  }
}

seedCapabilities();
for(const c of db.prepare("SELECT id FROM companies").all()) { provisionWorkforce(c.id,null); ensureOrchestrator(c.id); }

export { app, db };