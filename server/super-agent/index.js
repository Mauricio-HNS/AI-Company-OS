import { db } from "../db/index.js";
import { audit } from "../audit/index.js";
import { provisionWorkforce } from "../workforce/index.js";
import { executePlan } from "../missions/engine.js";
import { now, id, safeJson } from "../core/utils.js";

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


export { CAPABILITY_SEED, ensureOrchestrator, seedCapabilities, analyzeCompany, runSuperAgent };
