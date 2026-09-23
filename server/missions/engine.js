import { db } from "../db/index.js";
import { audit } from "../audit/index.js";
import { companySnapshot, executeCapability } from "../capabilities/index.js";
import { governanceDecision } from "../governance/index.js";
import { now, id } from "../core/utils.js";

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
  db.prepare("INSERT INTO ai_execution_runs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id(),mission.plan_id,step.id,mission.company_id,step.capability_key,finalStatus,step.risk_level||"LOW",JSON.stringify(execution.input||{}),JSON.stringify(execution.output||{}),JSON.stringify(execution.verification||{}),finalStatus.startsWith("FAILED")?execution.result:"",started,finished);
  audit(actorId||null,"MISSION_EXECUTED","ai_mission",mission.id,{capability:step.capability_key,status:finalStatus,verified});
  return {mission:db.prepare("SELECT * FROM ai_missions WHERE id=?").get(mission.id),execution:{...execution,status:finalStatus}};
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

export { executeMission, executePlan };
