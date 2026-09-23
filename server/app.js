import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import multer from "multer";
import { PORT, JWT_SECRET, MASTER_EMAIL, MASTER_PASSWORD } from "./config/env.js";
import { UPLOAD_DIR } from "./config/paths.js";
import { db } from "./db/index.js";
import { auth, master, sign } from "./auth/index.js";
import { audit } from "./audit/index.js";
import crypto from "node:crypto";

const app = express();

function now() { return new Date().toISOString(); }
function id() { return crypto.randomUUID(); }
function hashToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
function workforceBlueprint(company) {
  const type=String(company.type||"").toLowerCase();
  const core=[
    {role:"AI Company Manager",name:"AI Manager",department:"MANAGEMENT",description:"Coordena a operação, indicadores e missões da empresa.",autonomy:"EXECUTIVE",permissions:["read:all","create:mission","assign:agent"],tools:["erp","crm","support","workforce"],goals:["manter a operação sob controle"],kpis:["operational_health","mission_completion"]},
    {role:"Operations Manager",name:"AI Operations",department:"OPERATIONS",description:"Acompanha processos, tarefas e gargalos operacionais.",autonomy:"AUTONOMOUS",permissions:["read:operations","create:task","update:task"],tools:["erp","tasks"],goals:["reduzir gargalos"],kpis:["task_completion","cycle_time"]},
    {role:"Sales & CRM Manager",name:"AI Sales",department:"SALES",description:"Organiza leads, oportunidades e follow-ups.",autonomy:"AUTONOMOUS",permissions:["read:crm","create:lead","create:followup"],tools:["crm","analytics"],goals:["aumentar oportunidades qualificadas"],kpis:["leads","conversion_rate"]},
    {role:"Finance Manager",name:"AI Finance",department:"FINANCE",description:"Monitora faturamento, pagamentos e inadimplência.",autonomy:"OPERATIONAL",permissions:["read:finance","create:invoice_draft","flag:overdue"],tools:["erp","finance"],goals:["manter recebimentos em dia"],kpis:["open_balance","collection_rate"]},
    {role:"Support Manager",name:"AI Support",department:"SUPPORT",description:"Faz triagem de chamados, responde e escala problemas.",autonomy:"AUTONOMOUS",permissions:["read:support","reply:support","escalate:support"],tools:["support","knowledge"],goals:["resolver chamados rapidamente"],kpis:["first_response","resolution_time","sla"]},
    {role:"Marketing Manager",name:"AI Marketing",department:"MARKETING",description:"Planeja conteúdo, campanhas e acompanhamento de resultados.",autonomy:"OPERATIONAL",permissions:["read:marketing","create:campaign","draft:content"],tools:["marketing","analytics"],goals:["gerar demanda qualificada"],kpis:["leads_generated","campaign_roi"]}
  ];
  const extras=[];
  if(/sal[aã]o|barber|beauty|cabeleire|est[eé]tica|spa/.test(type)) extras.push({role:"Salon Operations Manager",name:"AI Salon",department:"SALON",description:"Cuida de agenda, serviços, clientes e operação do salão.",autonomy:"AUTONOMOUS",permissions:["read:salon","manage:appointments","manage:commission"],tools:["salon","crm","finance"],goals:["otimizar agenda e ocupação"],kpis:["occupancy","revenue_per_service"]});
  if(/restaurant|restaurante|food|caf[eé]|bar/.test(type)) extras.push({role:"Hospitality Manager",name:"AI Hospitality",department:"OPERATIONS",description:"Acompanha reservas, atendimento e experiência do cliente.",autonomy:"AUTONOMOUS",permissions:["read:operations","manage:reservations"],tools:["operations","crm"],goals:["melhorar experiência do cliente"],kpis:["occupancy","customer_satisfaction"]});
  if(/software|saas|tech|tecnolog|desenvolvimento|it/.test(type)) extras.push({role:"Product & Technology Manager",name:"AI Product",department:"PRODUCT",description:"Acompanha produto, backlog, qualidade e evolução técnica.",autonomy:"AUTONOMOUS",permissions:["read:product","create:task","analyze:quality"],tools:["tasks","analytics","knowledge"],goals:["melhorar produto continuamente"],kpis:["delivery_rate","quality"]});
  return core.concat(extras);
}
function provisionWorkforce(companyId, actorId) {
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(companyId);
  if(!company) return [];
  const existing=db.prepare("SELECT role FROM ai_agents WHERE company_id=?").all(companyId);
  const roles=new Set(existing.map(a=>String(a.role).toLowerCase()));
  const created=[];
  for(const item of workforceBlueprint(company)) {
    if(roles.has(item.role.toLowerCase())) continue;
    const t=now();
    const a={id:id(),company_id:companyId,name:item.name,role:item.role,department:item.department,description:item.description,autonomy:item.autonomy,status:"READY",source:"AUTO",permissions:JSON.stringify(item.permissions),tools:JSON.stringify(item.tools),goals:JSON.stringify(item.goals),kpis:JSON.stringify(item.kpis),supervisor_id:null,created_at:t,updated_at:t};
    db.prepare("INSERT INTO ai_agents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(a));
    created.push(a);
    roles.add(item.role.toLowerCase());
  }
  const manager=db.prepare("SELECT id FROM ai_agents WHERE company_id=? AND department='MANAGEMENT' LIMIT 1").get(companyId);
  if(manager) db.prepare("UPDATE ai_agents SET supervisor_id=?,updated_at=? WHERE company_id=? AND id<>? AND supervisor_id IS NULL").run(manager.id,now(),companyId,manager.id);
  if(actorId && created.length) audit(actorId,"WORKFORCE_PROVISIONED","company",companyId,{count:created.length});
  return created;
}



function companySnapshot(companyId) {
  const open=db.prepare("SELECT COUNT(*) n, COALESCE(SUM(total-paid_amount),0) balance FROM invoices WHERE company_id=? AND status IN ('OPEN','PARTIALLY_PAID')").get(companyId);
  const overdue=db.prepare("SELECT COUNT(*) n, COALESCE(SUM(total-paid_amount),0) balance FROM invoices WHERE company_id=? AND status IN ('OPEN','PARTIALLY_PAID') AND due_date < ?").get(companyId,now().slice(0,10));
  const support=db.prepare("SELECT COUNT(*) n FROM support_tickets WHERE company_id=? AND status NOT IN ('RESOLVIDO','FECHADO')").get(companyId);
  const agents=db.prepare("SELECT COUNT(*) n FROM ai_agents WHERE company_id=? AND status<>'DISABLED'").get(companyId);
  const missions=db.prepare("SELECT COUNT(*) n FROM ai_missions WHERE company_id=? AND status NOT IN ('COMPLETED','CANCELLED')").get(companyId);
  return {open_invoices:open.n,open_balance:open.balance,overdue_invoices:overdue.n,overdue_balance:overdue.balance,pending_support:support.n,active_ai_agents:agents.n,active_missions:missions.n};
}
function createMission(companyId, planId, step, title, objective, department, priority, agentId, actorId) {
  const t=now();
  const mission={id:id(),company_id:companyId,plan_id:planId,plan_step_id:step.id,title,objective,department,priority,status:"PLANNED",assigned_agent_id:agentId||null,result:"",created_at:t,updated_at:t};
  db.prepare("INSERT INTO ai_missions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(mission));
  audit(actorId||null,"AI_MISSION_CREATED","ai_mission",mission.id,{planId,stepId:step.id,capability:step.capability_key});
  return mission;
}
function executeCapability(companyId, plan, step, actorId) {
  const input=companySnapshot(companyId);
  const capability=step.capability_key;
  let output={}, result="", verification={}, status="COMPLETED";
  if(capability==="finance.analyze") {
    output={financial_snapshot:input,generated_at:now()};
    result="Análise financeira executada sobre dados reais do ERP.";
    verification={verified:true,checks:["invoice_balance","overdue_balance"],after:companySnapshot(companyId)};
  } else if(capability==="support.triage") {
    const tickets=db.prepare("SELECT * FROM support_tickets WHERE company_id=? AND status NOT IN ('RESOLVIDO','FECHADO') ORDER BY created_at ASC").all(companyId);
    let changed=0;
    for(const ticket of tickets) {
      const ageHours=(Date.now()-Date.parse(ticket.created_at))/3600000;
      const priority=ageHours>=48?"Crítica":ageHours>=24?"Alta":ticket.priority;
      if(priority!==ticket.priority) { db.prepare("UPDATE support_tickets SET priority=?,updated_at=? WHERE id=?").run(priority,now(),ticket.id); changed++; }
    }
    output={tickets_seen:tickets.length,tickets_reprioritized:changed};
    result=`Triagem real executada: ${tickets.length} chamados analisados e ${changed} priorizados.`;
    verification={verified:true,checks:["ticket_priority_recalculated"],after:companySnapshot(companyId)};
  } else if(capability==="crm.read") {
    const customers=db.prepare("SELECT COUNT(*) n FROM crm_customers WHERE company_id=? AND status='ACTIVE'").get(companyId).n;
    const leads=db.prepare("SELECT COUNT(*) n FROM crm_leads WHERE company_id=? AND status NOT IN ('CONVERTED','LOST')").get(companyId).n;
    const opportunities=db.prepare("SELECT COUNT(*) n, COALESCE(SUM(value),0) value FROM crm_opportunities WHERE company_id=? AND stage NOT IN ('WON','LOST')").get(companyId);
    output={customers,leads,open_opportunities:opportunities.n,pipeline_value:opportunities.value};
    result="Leitura CRM executada sobre clientes, leads e oportunidades persistidos.";
    verification={verified:true,checks:["crm_customers","crm_leads","crm_opportunities"]};
  } else if(capability==="crm.followup") {
    const leads=db.prepare("SELECT * FROM crm_leads WHERE company_id=? AND status='NEW' ORDER BY created_at ASC LIMIT 20").all(companyId);
    let created=0;
    for(const lead of leads) {
      const existing=db.prepare("SELECT id FROM ai_missions WHERE company_id=? AND objective LIKE ? LIMIT 1").get(companyId,"%"+lead.id+"%");
      if(!existing) { createMission(companyId,plan.id,step,"Follow-up de lead","Realizar follow-up do lead "+lead.name+" (lead:"+lead.id+").","SALES","MEDIUM",step.assigned_agent_id,actorId); created++; }
    }
    output={new_leads:leads.length,followup_missions_created:created};
    result="Follow-ups de CRM convertidos em missões persistentes.";
    verification={verified:true,checks:["followup_missions_created"],after:companySnapshot(companyId)};
  } else if(capability==="workforce.create") {
    const requested=(safeJson(plan.detected_needs,"[]").find(n=>n.key==="workforce.create")||{}).need||"capacidade especializada";
    const before=db.prepare("SELECT id FROM ai_agents WHERE company_id=? AND status<>'DISABLED'").all(companyId);
    const created=provisionWorkforce(companyId,actorId);
    const after=db.prepare("SELECT * FROM ai_agents WHERE company_id=? AND status<>'DISABLED'").all(companyId);
    const agent=created[0]||after.find(a=>!before.some(b=>b.id===a.id));
    if(!agent) throw new Error("Não foi possível provisionar a capacidade de workforce.");
    output={agent_id:agent.id,agent_name:agent.name,role:agent.role,need:requested};
    result="Capacidade especializada provisionada no AI Workforce.";
    verification={verified:!!db.prepare("SELECT 1 FROM ai_agents WHERE id=? AND status<>'DISABLED'").get(agent.id),checks:["agent_created_or_existing"]};
  } else if(capability==="marketing.plan") {
    const mission=createMission(companyId,plan.id,step,"Plano de Marketing","Definir e executar ações de aquisição, conteúdo e campanhas com base nos indicadores atuais.","MARKETING", "MEDIUM", step.assigned_agent_id, actorId);
    output={mission_id:mission.id};
    result="Plano de marketing convertido em missão persistente.";
    verification={verified:!!db.prepare("SELECT 1 FROM ai_missions WHERE id=?").get(mission.id),mission_id:mission.id};
  } else if(capability==="mission.create") {
    const mission=createMission(companyId,plan.id,step,step.title,step.title,"GENERAL","MEDIUM",step.assigned_agent_id,actorId);
    output={mission_id:mission.id};
    result="Missão persistente criada no backend.";
    verification={verified:!!db.prepare("SELECT 1 FROM ai_missions WHERE id=?").get(mission.id),mission_id:mission.id};
  } else if(capability==="growth.optimize") {
    const mission=createMission(companyId,plan.id,step,"Otimização de Crescimento","Analisar gargalos e oportunidades e executar ações de crescimento mensuráveis.","GROWTH","HIGH",step.assigned_agent_id,actorId);
    output={mission_id:mission.id,baseline:input};
    result="Objetivo de crescimento convertido em missão persistente com baseline.";
    verification={verified:!!db.prepare("SELECT 1 FROM ai_missions WHERE id=?").get(mission.id),baseline:input};
  } else if(capability==="analytics.measure") {
    output={baseline:input,measured_at:now()};
    result="Medição executada com snapshot real do estado da empresa.";
    verification={verified:true,checks:["company_snapshot"]};
  } else {
    status="PENDING_ADAPTER";
    result="Capability reconhecida, mas ainda sem adaptador de execução.";
    output={adapter_ready:false};
    verification={verified:false,reason:"NO_ADAPTER"};
  }
  return {status,result,input,output,verification};
}
function governanceDecision(companyId, capabilityKey) {
  const cap=db.prepare("SELECT * FROM ai_capabilities WHERE key=? AND active=1").get(capabilityKey);
  if(!cap) return {decision:"BLOCK",reason:"CAPABILITY_NOT_FOUND"};
  const policy=db.prepare("SELECT * FROM ai_policies WHERE (company_id=? OR company_id IS NULL) AND capability_key=? ORDER BY CASE WHEN company_id IS NULL THEN 1 ELSE 0 END, updated_at DESC LIMIT 1").get(companyId,capabilityKey);
  if(policy) return {decision:policy.effect==="ALLOW"?"ALLOW":policy.effect==="ESCALATE"?"ESCALATE":"BLOCK",reason:policy.reason||"Policy personalizada"};
  if(Number(cap.requires_approval)===1 || ["MEDIUM","HIGH","CRITICAL"].includes(String(cap.risk_level).toUpperCase())) return {decision:"ESCALATE",reason:"Capability exige aprovação pela política de risco."};
  return {decision:"ALLOW",reason:"Capability de baixo risco."};
}

function executeMission(missionId, actorId) {
  const mission=db.prepare("SELECT * FROM ai_missions WHERE id=?").get(missionId);
  if(!mission) return {error:"MISSION_NOT_FOUND"};
  if(["COMPLETED","CANCELLED"].includes(mission.status)) return {mission};
  if(!mission.plan_id || !mission.plan_step_id) {
    db.prepare("UPDATE ai_missions SET status='BLOCKED_NO_CAPABILITY',result=?,updated_at=? WHERE id=?").run("Missão sem plano/step/capability executável.",now(),mission.id);
    audit(actorId||null,"MISSION_BLOCKED","ai_mission",mission.id,{reason:"NO_PLAN_STEP"});
    return {mission:db.prepare("SELECT * FROM ai_missions WHERE id=?").get(mission.id),status:"BLOCKED_NO_CAPABILITY"};
  }
  const step=db.prepare("SELECT s.*,c.risk_level,c.requires_approval AS cap_approval FROM ai_plan_steps s LEFT JOIN ai_capabilities c ON c.key=s.capability_key WHERE s.id=?").get(mission.plan_step_id);
  if(!step || !step.capability_key) {
    db.prepare("UPDATE ai_missions SET status='BLOCKED_NO_CAPABILITY',result=?,updated_at=? WHERE id=?").run("Não existe capability executável para esta missão.",now(),mission.id);
    return {mission:db.prepare("SELECT * FROM ai_missions WHERE id=?").get(mission.id),status:"BLOCKED_NO_CAPABILITY"};
  }
  const gate=governanceDecision(mission.company_id,step.capability_key);
  if(gate.decision!=="ALLOW") {
    db.prepare("UPDATE ai_missions SET status='PENDING_APPROVAL',result=?,updated_at=? WHERE id=?").run(gate.reason,now(),mission.id);
    db.prepare("UPDATE ai_plan_steps SET status='PENDING_APPROVAL',result=?,updated_at=? WHERE id=?").run(gate.reason,now(),step.id);
    audit(actorId||null,"MISSION_GOVERNANCE_GATE","ai_mission",mission.id,{decision:gate.decision,capability:step.capability_key});
    return {mission:db.prepare("SELECT * FROM ai_missions WHERE id=?").get(mission.id),status:"PENDING_APPROVAL",decision:gate.decision};
  }
  db.prepare("UPDATE ai_missions SET status='RUNNING',updated_at=? WHERE id=?").run(now(),mission.id);
  db.prepare("UPDATE ai_plan_steps SET status='RUNNING',updated_at=? WHERE id=?").run(now(),step.id);
  const started=now();
  let execution;
  try { execution=executeCapability(mission.company_id,db.prepare("SELECT * FROM ai_plans WHERE id=?").get(mission.plan_id),step,actorId); }
  catch(err) { execution={status:"FAILED",result:"Falha no adaptador: "+err.message,input:companySnapshot(mission.company_id),output:{},verification:{verified:false,error:err.message}}; }
  const finished=now();
  const verified=execution.verification?.verified===true;
  const finalStatus=execution.status==="COMPLETED" && verified ? "COMPLETED" : execution.status==="COMPLETED" ? "FAILED_VERIFICATION" : execution.status;
  db.prepare("UPDATE ai_missions SET status=?,result=?,updated_at=? WHERE id=?").run(finalStatus,execution.result||"",finished,mission.id);
  db.prepare("UPDATE ai_plan_steps SET status=?,result=?,updated_at=? WHERE id=?").run(finalStatus,execution.result||"",finished,step.id);
  db.prepare("INSERT INTO ai_execution_runs VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(id(),mission.plan_id,step.id,mission.company_id,step.capability_key,finalStatus,step.risk_level||"LOW",JSON.stringify(execution.input||{}),JSON.stringify(execution.output||{}),JSON.stringify(execution.verification||{}),finalStatus.startsWith("FAILED")?execution.result:"",started,finished);
  audit(actorId||null,"MISSION_EXECUTED","ai_mission",mission.id,{capability:step.capability_key,status:finalStatus,verified});
  return {mission:db.prepare("SELECT * FROM ai_missions WHERE id=?").get(mission.id),execution:{...execution,status:finalStatus}};
}

function runSuperAgent(companyId, actorId, maxCycles=3) {
  const cycles=Math.max(1,Math.min(3,Number(maxCycles)||3));
  const results=[];
  for(let cycle=1;cycle<=cycles;cycle++) {
    const analysis=analyzeCompany(companyId,actorId);
    if(!analysis?.plan?.id) break;
    const execution=executePlan(analysis.plan.id,actorId);
    results.push({cycle,analysis,execution});
    const failed=execution?.failed||0, blocked=execution?.blocked||0;
    if(failed===0 && blocked===0 && execution?.executed===execution?.steps?.length) break;
    if(cycle<cycles && failed===0 && blocked>0) break;
  }
  audit(actorId||null,"SUPER_AGENT_RUN","company",companyId,{cycles:results.length,maxCycles:cycles});
  return {company:db.prepare("SELECT * FROM companies WHERE id=?").get(companyId),cycles:results};
}

function executePlan(planId, actorId) {
  const plan=db.prepare("SELECT * FROM ai_plans WHERE id=?").get(planId);
  if(!plan) return null;
  const steps=db.prepare("SELECT s.*,c.risk_level,c.requires_approval AS cap_approval FROM ai_plan_steps s LEFT JOIN ai_capabilities c ON c.key=s.capability_key WHERE s.plan_id=? ORDER BY s.step_order").all(planId);
  let executed=0,blocked=0,failed=0;
  for(const s of steps) {
    const started=now();
    const gate=governanceDecision(plan.company_id,s.capability_key);
    if(s.requires_approval || s.cap_approval || gate.decision!=="ALLOW") {
      const reason=gate.reason||"Governance gate: aprovação necessária antes do efeito.";
      db.prepare("UPDATE ai_plan_steps SET status='PENDING_APPROVAL',result=?,updated_at=? WHERE id=?").run(reason,started,s.id);
      db.prepare("INSERT INTO ai_execution_runs VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(id(),plan.id,s.id,plan.company_id,s.capability_key,"PENDING_APPROVAL",s.risk_level||"MEDIUM",JSON.stringify(companySnapshot(plan.company_id)),"{}",JSON.stringify({decision:gate.decision,reason}),reason,started,null);
      blocked++; continue;
    }
    let execution;
    try { execution=executeCapability(plan.company_id,plan,s,actorId); }
    catch(err) {
      execution={status:"FAILED",result:"Falha no adaptador: "+err.message,input:companySnapshot(plan.company_id),output:{},verification:{verified:false,error:err.message}};
    }
    const finished=now();
    db.prepare("UPDATE ai_plan_steps SET status=?,result=?,updated_at=? WHERE id=?").run(execution.status,execution.result,finished,s.id);
    db.prepare("INSERT INTO ai_execution_runs VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(id(),plan.id,s.id,plan.company_id,s.capability_key,execution.status,s.risk_level||"LOW",JSON.stringify(execution.input||{}),JSON.stringify(execution.output||{}),JSON.stringify(execution.verification||{}),execution.status==="FAILED"?execution.result:"",started,finished);
    if(execution.status==="COMPLETED") executed++; else if(execution.status==="FAILED") failed++;
  }
  const finalStatus=failed ? "EXECUTION_FAILED" : blocked ? "PARTIALLY_EXECUTED" : (steps.length&&executed===steps.length ? "EXECUTED" : "EXECUTION_PENDING_ADAPTER");
  db.prepare("UPDATE ai_plans SET status=?,updated_at=? WHERE id=?").run(finalStatus,now(),planId);
  audit(actorId||null,"SUPER_AGENT_EXECUTION","ai_plan",planId,{executed,blocked,failed,total:steps.length});
  return {plan:db.prepare("SELECT * FROM ai_plans WHERE id=?").get(planId),steps:db.prepare("SELECT * FROM ai_plan_steps WHERE plan_id=? ORDER BY step_order").all(planId),executed,blocked,failed};
}

const CAPABILITY_SEED = [
  ["crm.read","Ler CRM","CRM","Consultar clientes, leads e oportunidades","READ","LOW",0],
  ["crm.followup","Criar follow-up","CRM","Criar ações de acompanhamento comercial","CREATE","LOW",0],
  ["finance.analyze","Analisar financeiro","FINANCE","Analisar faturamento, recebimentos e inadimplência","ANALYZE","LOW",0],
  ["marketing.plan","Planejar marketing","MARKETING","Criar plano de campanhas e aquisição","PLAN","LOW",0],
  ["support.triage","Triar suporte","SUPPORT","Classificar e priorizar chamados","UPDATE","LOW",0],
  ["workforce.create","Criar funcionário IA","WORKFORCE","Criar uma capacidade especializada no workforce","CREATE","MEDIUM",1],
  ["mission.create","Criar missão","WORKFORCE","Transformar um objetivo em missão executável","CREATE","LOW",0],
  ["analytics.measure","Medir resultado","ANALYTICS","Comparar indicadores antes e depois de uma ação","ANALYZE","LOW",0],
  ["growth.optimize","Otimizar crescimento","GROWTH","Identificar gargalos e oportunidades de crescimento","PLAN","MEDIUM",1]
];
function ensureOrchestrator(companyId) {
  const existing=db.prepare("SELECT * FROM ai_orchestrators WHERE company_id=?").get(companyId);
  if(existing) return existing;
  const t=now();
  const o={id:id(),company_id:companyId,name:"Super Agent",status:"ACTIVE",autonomy:"HIGH",objective:"Fazer a empresa crescer, operar melhor e resolver seus gargalos continuamente.",last_analysis_at:null,created_at:t,updated_at:t};
  db.prepare("INSERT INTO ai_orchestrators VALUES (?,?,?,?,?,?,?,?,?)").run(...Object.values(o));
  return o;
}
function seedCapabilities() {
  const stmt=db.prepare("INSERT OR IGNORE INTO ai_capabilities VALUES (?,?,?,?,?,?,?,?)");
  const t=now();
  for(const x of CAPABILITY_SEED) stmt.run(x[0],x[1],x[2],x[3],x[4],x[5],x[6],1,t);
}
function safeJson(value, fallback=[]) { try { return JSON.parse(value||"[]"); } catch { return fallback; } }
function analyzeCompany(companyId, actorId) {
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(companyId);
  if(!company) return null;
  seedCapabilities();
  const orchestrator=ensureOrchestrator(companyId);
  const agents=db.prepare("SELECT * FROM ai_agents WHERE company_id=? AND status<>'DISABLED'").all(companyId);
  const finance=db.prepare("SELECT COUNT(*) open FROM invoices WHERE company_id=? AND status IN ('OPEN','PARTIALLY_PAID')").get(companyId);
  const overdue=db.prepare("SELECT COUNT(*) n FROM invoices WHERE company_id=? AND status IN ('OPEN','PARTIALLY_PAID') AND due_date < ?").get(companyId,now().slice(0,10));
  const support=db.prepare("SELECT COUNT(*) n FROM support_tickets WHERE company_id=? AND status NOT IN ('RESOLVIDO','FECHADO')").get(companyId);
  const needs=[];
  const roles=new Set(agents.map(a=>String(a.role).toLowerCase()));
  if(finance.open>0) needs.push({key:"finance.analyze",need:"Existe saldo/faturamento em aberto",priority:overdue.n>0?"HIGH":"MEDIUM"});
  if(overdue.n>0) needs.push({key:"finance.analyze",need:"Existem faturas vencidas",priority:"HIGH"});
  if(support.n>0) needs.push({key:"support.triage",need:"Existem chamados pendentes",priority:"MEDIUM"});
  if(!roles.has("sales & crm manager")) needs.push({key:"workforce.create",need:"Cobertura comercial insuficiente",priority:"HIGH"});
  if(!roles.has("marketing manager")) needs.push({key:"workforce.create",need:"Cobertura de marketing insuficiente",priority:"MEDIUM"});
  if(!roles.has("operations manager")) needs.push({key:"workforce.create",need:"Cobertura operacional insuficiente",priority:"MEDIUM"});
  if(!needs.length) needs.push({key:"growth.optimize",need:"Buscar novas oportunidades de crescimento",priority:"MEDIUM"});
  const objective="Aumentar o crescimento e a saúde operacional de "+company.name;
  const summary="O Super Agent analisou "+agents.length+" funcionários IA, "+finance.open+" itens financeiros em aberto e "+support.n+" chamados pendentes. Identificou "+needs.length+" necessidades prioritárias.";
  const t=now();
  const plan={id:id(),company_id:companyId,orchestrator_id:orchestrator.id,objective,status:"PLANNED",summary,detected_needs:JSON.stringify(needs),created_at:t,updated_at:t};
  db.prepare("INSERT INTO ai_plans VALUES (?,?,?,?,?,?,?,?,?)").run(...Object.values(plan));
  const agentByDept={};
  for(const a of agents) agentByDept[a.department]=a;
  needs.forEach((n,i)=>{
    const cap=db.prepare("SELECT * FROM ai_capabilities WHERE key=?").get(n.key);
    let assigned=null;
    if(n.key.startsWith("finance")) assigned=agentByDept.FINANCE;
    else if(n.key.startsWith("support")) assigned=agentByDept.SUPPORT;
    else if(n.key.startsWith("marketing")) assigned=agentByDept.MARKETING;
    else assigned=agentByDept.MANAGEMENT;
    db.prepare("INSERT INTO ai_plan_steps VALUES (?,?,?,?,?,?,?,?,?,?)").run(id(),plan.id,i+1,n.need,n.key,assigned?.id||null,"PLANNED",cap?.requires_approval?1:0,"",t,t);
  });
  db.prepare("UPDATE ai_orchestrators SET last_analysis_at=?,updated_at=? WHERE id=?").run(t,t,orchestrator.id);
  audit(actorId||null,"SUPER_AGENT_ANALYSIS","ai_orchestrator",orchestrator.id,{companyId,planId:plan.id,needs});
  return {company,orchestrator,plan,needs,agents};
}
\nconst upload = multer({
  storage: multer.diskStorage({
    destination: (_req,_file,cb)=>cb(null,UPLOAD_DIR),
    filename: (_req,file,cb)=>cb(null, id()+"-"+file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_"))
  }),
  limits:{ fileSize: 15*1024*1024 }
});

app.use(cors({ origin:true, credentials:false }));
app.use(express.json({limit:"2mb"}));

app.get("/api/health", (_req,res)=>res.json({ok:true,service:"ai-company-os-server",time:now()}));

app.post("/api/auth/master", async (req,res)=>{
  const {email,password}=req.body||{};
  if(email!==MASTER_EMAIL || password!==MASTER_PASSWORD) return res.status(401).json({error:"INVALID_CREDENTIALS"});
  let u=db.prepare("SELECT * FROM users WHERE email=?").get(MASTER_EMAIL);
  if(!u) {
    const t=now(), hash=await bcrypt.hash(MASTER_PASSWORD,12);
    u={id:id(),company_id:null,name:"Master Administrator",email:MASTER_EMAIL,password_hash:hash,role:"MASTER",active:1,created_at:t};
    db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?,?)").run(u.id,null,u.name,u.email,u.password_hash,u.role,1,t);
  }
  audit(u.id,"MASTER_LOGIN","user",u.id);
  res.json({token:sign(u),user:{id:u.id,name:u.name,email:u.email,role:u.role}});
});

app.post("/api/auth/client/signup", async (req,res)=>{
  const {inviteToken,name,email,password}=req.body||{};
  if(!inviteToken||!name||!email||!password||password.length<8) return res.status(400).json({error:"INVALID_INPUT"});
  const inv=db.prepare("SELECT * FROM invites WHERE token_hash=?").get(hashToken(inviteToken));
  if(!inv || inv.revoked_at || (inv.expires_at && inv.expires_at < now())) return res.status(400).json({error:"INVALID_OR_EXPIRED_INVITE"});
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(inv.company_id);
  if(!company || company.status==="CONGELADA" || company.status==="ENCERRADA") return res.status(403).json({error:"COMPANY_ACCESS_BLOCKED"});
  if(db.prepare("SELECT id FROM users WHERE email=?").get(email)) return res.status(409).json({error:"EMAIL_ALREADY_EXISTS"});
  const u={id:id(),company_id:company.id,name,email,password_hash:await bcrypt.hash(password,12),role:"CLIENT",active:1,created_at:now()};
  db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?,?)").run(u.id,u.company_id,u.name,u.email,u.password_hash,u.role,1,u.created_at);
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

app.get("/api/master/products",master,(_req,res)=>{
  res.json(db.prepare("SELECT * FROM products ORDER BY active DESC,name").all());
});
app.post("/api/master/products",master,(req,res)=>{
  const {name,description="",type="SERVICE",price=0,billing_cycle="MONTHLY"}=req.body||{};
  if(!String(name||"").trim()) return res.status(400).json({error:"NAME_REQUIRED"});
  const p={id:id(),name:String(name).trim(),description,type,price:Number(price)||0,billing_cycle,active:1,created_at:now()};
  db.prepare("INSERT INTO products VALUES (?,?,?,?,?,?,?,?)").run(...Object.values(p));
  audit(req.user.sub,"PRODUCT_CREATED","product",p.id,p); res.status(201).json(p);
});
app.patch("/api/master/products/:id",master,(req,res)=>{
  const p=db.prepare("SELECT * FROM products WHERE id=?").get(req.params.id);
  if(!p)return res.status(404).json({error:"PRODUCT_NOT_FOUND"});
  const n={...p,...req.body}; db.prepare("UPDATE products SET name=?,description=?,type=?,price=?,billing_cycle=?,active=? WHERE id=?").run(n.name,n.description,n.type,Number(n.price)||0,n.billing_cycle,n.active?1:0,p.id);
  audit(req.user.sub,"PRODUCT_UPDATED","product",p.id,{before:p,after:n});res.json(n);
});
app.get("/api/master/companies/:id/erp",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const subscriptions=db.prepare("SELECT s.*,p.name product_name,p.billing_cycle FROM subscriptions s JOIN products p ON p.id=s.product_id WHERE s.company_id=? ORDER BY s.created_at DESC").all(company.id);
  const invoices=db.prepare("SELECT * FROM invoices WHERE company_id=? ORDER BY due_date DESC").all(company.id);
  const payments=db.prepare("SELECT * FROM payments WHERE company_id=? ORDER BY paid_at DESC").all(company.id);
  const contracts=db.prepare("SELECT * FROM contracts WHERE company_id=? ORDER BY created_at DESC").all(company.id);
  const events=db.prepare("SELECT * FROM company_events WHERE company_id=? ORDER BY created_at DESC LIMIT 100").all(company.id);
  res.json({company,subscriptions,invoices,payments,contracts,events});
});
app.post("/api/master/companies/:id/subscriptions",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  const product=db.prepare("SELECT * FROM products WHERE id=? AND active=1").get(req.body?.productId);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  if(!product)return res.status(404).json({error:"PRODUCT_NOT_FOUND"});
  const quantity=Math.max(1,Number(req.body.quantity)||1), unitPrice=Number(req.body.unitPrice ?? product.price)||0;
  const start=req.body.startDate||now().slice(0,10);
  const sub={id:id(),company_id:company.id,product_id:product.id,status:"ACTIVE",quantity,unit_price:unitPrice,start_date:start,next_billing_date:req.body.nextBillingDate||null,end_date:null,created_at:now(),updated_at:now()};
  db.prepare("INSERT INTO subscriptions VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(sub));
  db.prepare("INSERT INTO company_events VALUES (?,?,?,?,?,?)").run(id(),company.id,"SUBSCRIPTION_CREATED","Assinatura criada: "+product.name,req.user.sub,now());
  audit(req.user.sub,"SUBSCRIPTION_CREATED","subscription",sub.id,sub);res.status(201).json(sub);
});
app.post("/api/master/companies/:id/invoices",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const subtotal=Number(req.body?.subtotal)||0,tax=Number(req.body?.tax)||0,total=subtotal+tax;
  const seq=db.prepare("SELECT COUNT(*) n FROM invoices").get().n+1;
  const invoice={id:id(),company_id:company.id,subscription_id:req.body?.subscriptionId||null,number:"INV-"+String(seq).padStart(6,"0"),status:"OPEN",issue_date:req.body?.issueDate||now().slice(0,10),due_date:req.body?.dueDate||now().slice(0,10),subtotal,tax,total,paid_amount:0,created_at:now(),updated_at:now()};
  db.prepare("INSERT INTO invoices VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(invoice));
  db.prepare("INSERT INTO company_events VALUES (?,?,?,?,?,?)").run(id(),company.id,"INVOICE_CREATED","Fatura "+invoice.number+" criada",req.user.sub,now());
  audit(req.user.sub,"INVOICE_CREATED","invoice",invoice.id,invoice);res.status(201).json(invoice);
});
app.post("/api/master/invoices/:id/payments",master,(req,res)=>{
  const invoice=db.prepare("SELECT * FROM invoices WHERE id=?").get(req.params.id);
  if(!invoice)return res.status(404).json({error:"INVOICE_NOT_FOUND"});
  const amount=Number(req.body?.amount)||0;
  if(amount<=0)return res.status(400).json({error:"INVALID_AMOUNT"});
  const payment={id:id(),invoice_id:invoice.id,company_id:invoice.company_id,amount,method:req.body?.method||"OTHER",reference:req.body?.reference||"",paid_at:req.body?.paidAt||now(),created_at:now()};
  db.prepare("INSERT INTO payments VALUES (?,?,?,?,?,?,?)").run(...Object.values(payment));
  const paid=Math.min(invoice.total,invoice.paid_amount+amount);
  const status=paid>=invoice.total?"PAID":"PARTIALLY_PAID";
  db.prepare("UPDATE invoices SET paid_amount=?,status=?,updated_at=? WHERE id=?").run(paid,status,now(),invoice.id);
  audit(req.user.sub,"PAYMENT_RECORDED","invoice",invoice.id,payment);res.status(201).json({...payment,invoice_status:status,paid_amount:paid});
});
app.post("/api/master/companies/:id/contracts",master,(req,res)=>{
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!company)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const c={id:id(),company_id:company.id,title:String(req.body?.title||"Contrato"),status:req.body?.status||"ACTIVE",start_date:req.body?.startDate||null,end_date:req.body?.endDate||null,monthly_value:Number(req.body?.monthlyValue)||0,notes:req.body?.notes||"",created_at:now(),updated_at:now()};
  db.prepare("INSERT INTO contracts VALUES (?,?,?,?,?,?,?,?,?,?)").run(...Object.values(c));
  audit(req.user.sub,"CONTRACT_CREATED","contract",c.id,c);res.status(201).json(c);
});
app.post("/api/master/companies/:id/status",master,(req,res)=>{
  const c=db.prepare("SELECT * FROM companies WHERE id=?").get(req.params.id);
  if(!c)return res.status(404).json({error:"COMPANY_NOT_FOUND"});
  const allowed=["ACTIVE","EM_IMPLANTACAO","PAGAMENTO_PENDENTE","INADIMPLENTE","SUSPENSA","CONGELADA","ENCERRADA","ARQUIVADA"];
  if(!allowed.includes(req.body?.status))return res.status(400).json({error:"INVALID_STATUS"});
  db.prepare("UPDATE companies SET status=?,updated_at=? WHERE id=?").run(req.body.status,now(),c.id);
  db.prepare("INSERT INTO company_events VALUES (?,?,?,?,?,?)").run(id(),c.id,"STATUS_CHANGED","Status alterado de "+c.status+" para "+req.body.status,req.user.sub,now());
  audit(req.user.sub,"COMPANY_STATUS_CHANGED","company",c.id,{from:c.status,to:req.body.status});
  res.json(db.prepare("SELECT * FROM companies WHERE id=?").get(c.id));
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
  res.json(executePlan(plan.id,req.user.sub));
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
  const result=executeMission(req.params.id,req.user.sub);
  if(result?.error==="MISSION_NOT_FOUND") return res.status(404).json(result);
  res.json(result);
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

app.get("/api/master/support/tickets",master,(_req,res)=>{
  const rows=db.prepare(`SELECT t.*,c.name company_name FROM support_tickets t JOIN companies c ON c.id=t.company_id ORDER BY t.created_at DESC`).all();
  res.json(rows);
});

app.get("/api/support/tickets",auth,(req,res)=>{
  if(req.user.role==="MASTER") return res.json(db.prepare("SELECT * FROM support_tickets ORDER BY created_at DESC").all());
  const rows=db.prepare("SELECT * FROM support_tickets WHERE company_id=? ORDER BY created_at DESC").all(req.user.companyId);
  res.json(rows);
});

app.post("/api/support/tickets",auth,(req,res)=>{
  if(!["CLIENT","MASTER"].includes(req.user.role)) return res.status(403).json({error:"FORBIDDEN"});
  const companyId=req.user.role==="MASTER"?req.body.companyId:req.user.companyId;
  const {subject,description,priority="Normal"}=req.body||{};
  if(!companyId||!subject||!description)return res.status(400).json({error:"INVALID_INPUT"});
  const n=db.prepare("SELECT COALESCE(MAX(ticket_number),0)+1 n FROM support_tickets").get().n;
  const t={id:id(),ticket_number:n,company_id:companyId,requester_id:req.user.sub,subject,description,priority,status:"NOVO",sla_hours:priority==="Crítica"?4:priority==="Alta"?8:24,created_at:now(),updated_at:now()};
  db.prepare("INSERT INTO support_tickets VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(t));
  audit(req.user.sub,"TICKET_CREATED","support_ticket",t.id,t);
  res.status(201).json(t);
});

app.get("/api/support/tickets/:id",auth,(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t)return res.status(404).json({error:"TICKET_NOT_FOUND"});
  if(req.user.role!=="MASTER" && t.company_id!==req.user.companyId)return res.status(403).json({error:"FORBIDDEN"});
  const messages=db.prepare("SELECT id,author_id,message,created_at FROM support_messages WHERE ticket_id=? ORDER BY created_at").all(t.id);
  const attachments=db.prepare("SELECT id,file_name,mime_type,size_bytes,created_at FROM support_attachments WHERE ticket_id=? ORDER BY created_at").all(t.id);
  res.json({ticket:t,messages,attachments});
});

app.post("/api/support/tickets/:id/messages",auth,(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t || (req.user.role!=="MASTER" && t.company_id!==req.user.companyId))return res.status(404).json({error:"TICKET_NOT_FOUND"});
  const message=String(req.body?.message||"").trim();if(!message)return res.status(400).json({error:"MESSAGE_REQUIRED"});
  const m={id:id(),ticket_id:t.id,author_id:req.user.sub,message,created_at:now()};
  db.prepare("INSERT INTO support_messages VALUES (?,?,?,?,?)").run(...Object.values(m));
  db.prepare("UPDATE support_tickets SET updated_at=? WHERE id=?").run(now(),t.id);
  audit(req.user.sub,"TICKET_MESSAGE","support_ticket",t.id);
  res.status(201).json(m);
});

app.patch("/api/support/tickets/:id",master,(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t)return res.status(404).json({error:"TICKET_NOT_FOUND"});
  const statuses=["NOVO","EM ATENDIMENTO","AGUARDANDO CLIENTE","AGUARDANDO AI","RESOLVIDO","FECHADO"];
  if(req.body?.status && !statuses.includes(req.body.status))return res.status(400).json({error:"INVALID_STATUS"});
  const status=req.body.status||t.status,priority=req.body.priority||t.priority;
  db.prepare("UPDATE support_tickets SET status=?,priority=?,updated_at=? WHERE id=?").run(status,priority,now(),t.id);
  audit(req.user.sub,"TICKET_UPDATED","support_ticket",t.id,{status,priority});
  res.json({...t,status,priority,updated_at:now()});
});

app.post("/api/support/tickets/:id/attachments",auth,upload.array("files",10),(req,res)=>{
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(req.params.id);
  if(!t || (req.user.role!=="MASTER" && t.company_id!==req.user.companyId))return res.status(404).json({error:"TICKET_NOT_FOUND"});
  const rows=[];
  for(const f of req.files||[]){
    const r={id:id(),ticket_id:t.id,uploaded_by:req.user.sub,file_name:f.originalname,storage_path:f.filename,mime_type:f.mimetype,size_bytes:f.size,created_at:now()};
    db.prepare("INSERT INTO support_attachments VALUES (?,?,?,?,?,?,?)").run(...Object.values(r));rows.push(r);
  }
  res.status(201).json(rows.map(x=>({id:x.id,file_name:x.file_name,mime_type:x.mime_type,size_bytes:x.size_bytes})));
});

app.use("/api/files",auth,(req,res,next)=>{
  const file=req.path.replace(/^\//,"");
  const row=db.prepare("SELECT * FROM support_attachments WHERE storage_path=?").get(file);
  if(!row)return res.status(404).end();
  const t=db.prepare("SELECT * FROM support_tickets WHERE id=?").get(row.ticket_id);
  if(req.user.role!=="MASTER" && t?.company_id!==req.user.companyId)return res.status(403).end();
  res.sendFile(path.join(UPLOAD_DIR,file));
});

app.get("/api/master/audit",master,(_req,res)=>res.json(db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500").all()));

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