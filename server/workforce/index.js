import { db } from "../db/index.js";
import { audit } from "../audit/index.js";
import { now, id } from "../core/utils.js";

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
  if(/restaurant|restaurante|food|caf[eé]|bar\b/.test(type)) extras.push({role:"Hospitality Manager",name:"AI Hospitality",department:"OPERATIONS",description:"Acompanha reservas, atendimento e experiência do cliente.",autonomy:"AUTONOMOUS",permissions:["read:operations","manage:reservations"],tools:["operations","crm"],goals:["melhorar experiência do cliente"],kpis:["occupancy","customer_satisfaction"]});
  if(/software|saas|tech|tecnolog|desenvolvimento|it\b/.test(type)) extras.push({role:"Product & Technology Manager",name:"AI Product",department:"PRODUCT",description:"Acompanha produto, backlog, qualidade e evolução técnica.",autonomy:"AUTONOMOUS",permissions:["read:product","create:task","analyze:quality"],tools:["tasks","analytics","knowledge"],goals:["melhorar produto continuamente"],kpis:["delivery_rate","quality"]});
  return core.concat(extras);
}

export function provisionWorkforce(companyId, actorId) {
  const company=db.prepare("SELECT * FROM companies WHERE id=?").get(companyId);
  if(!company) return [];
  const existing=db.prepare("SELECT role FROM ai_agents WHERE company_id=?").all(companyId);
  const roles=new Set(existing.map(a=>String(a.role).toLowerCase()));
  const created=[];
  for(const item of workforceBlueprint(company)) {
    if(roles.has(item.role.toLowerCase())) continue;
    const t=now();
    const a={id:id(),company_id:companyId,name:item.name,role:item.role,department:item.department,description:item.description,autonomy:item.autonomy,status:"READY",source:"AUTO",permissions:JSON.stringify(item.permissions),tools:JSON.stringify(item.tools),goals:JSON.stringify(item.goals),kpis:JSON.stringify(item.kpis),supervisor_id:null,created_at:t,updated_at:t};
    db.prepare("INSERT INTO ai_agents (id,company_id,name,role,department,description,autonomy,status,source,permissions,tools,goals,kpis,supervisor_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(a));
    created.push(a);
    roles.add(item.role.toLowerCase());
  }
  const manager=db.prepare("SELECT id FROM ai_agents WHERE company_id=? AND department='MANAGEMENT' LIMIT 1").get(companyId);
  if(manager) db.prepare("UPDATE ai_agents SET supervisor_id=?,updated_at=? WHERE company_id=? AND id<>? AND supervisor_id IS NULL").run(manager.id,now(),companyId,manager.id);
  if(actorId && created.length) audit(actorId,"WORKFORCE_PROVISIONED","company",companyId,{count:created.length});
  return created;
}
