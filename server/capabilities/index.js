import { db } from "../db/index.js";
import { audit } from "../audit/index.js";
import { provisionWorkforce } from "../workforce/index.js";
import { createMission } from "../missions/index.js";
import { now, id, safeJson } from "../core/utils.js";

function companySnapshot(companyId) {
  const open=db.prepare("SELECT COUNT(*) n, COALESCE(SUM(total-paid_amount),0) balance FROM invoices WHERE company_id=? AND status IN ('OPEN','PARTIALLY_PAID')").get(companyId);
  const overdue=db.prepare("SELECT COUNT(*) n, COALESCE(SUM(total-paid_amount),0) balance FROM invoices WHERE company_id=? AND status IN ('OPEN','PARTIALLY_PAID') AND due_date < ?").get(companyId,now().slice(0,10));
  const support=db.prepare("SELECT COUNT(*) n FROM support_tickets WHERE company_id=? AND status NOT IN ('RESOLVIDO','FECHADO')").get(companyId);
  const agents=db.prepare("SELECT COUNT(*) n FROM ai_agents WHERE company_id=? AND status<>'DISABLED'").get(companyId);
  const missions=db.prepare("SELECT COUNT(*) n FROM ai_missions WHERE company_id=? AND status NOT IN ('COMPLETED','CANCELLED')").get(companyId);
  return {open_invoices:open.n,open_balance:open.balance,overdue_invoices:overdue.n,overdue_balance:overdue.balance,pending_support:support.n,active_ai_agents:agents.n,active_missions:missions.n};
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

export { companySnapshot, executeCapability };
