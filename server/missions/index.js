import crypto from "node:crypto";
import { db } from "../db/index.js";
import { audit } from "../audit/index.js";
import { now, id } from "../core/utils.js";

export function createMission(companyId, planId, step, title, objective, department, priority, agentId, actorId) {
  const t=now();
  const mission={id:id(),company_id:companyId,plan_id:planId,plan_step_id:step.id,title,objective,department,priority,status:"PLANNED",assigned_agent_id:agentId||null,result:"",created_at:t,updated_at:t};
  db.prepare("INSERT INTO ai_missions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(...Object.values(mission));
  audit(actorId||null,"AI_MISSION_CREATED","ai_mission",mission.id,{planId,stepId:step.id,capability:step.capability_key});
  return mission;
}
