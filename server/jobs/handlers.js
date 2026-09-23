import { executeMission } from "../missions/engine.js";
import { executePlan } from "../missions/engine.js";

export function handleJob(job) {
  const payload = JSON.parse(job.payload || "{}");
  switch (job.type) {
    case "MISSION_EXECUTION":
      return executeMission(payload.missionId, payload.actorId || null);
    case "PLAN_EXECUTION":
      return executePlan(payload.planId, payload.actorId || null);
    default:
      throw new Error("UNKNOWN_JOB_TYPE");
  }
}
