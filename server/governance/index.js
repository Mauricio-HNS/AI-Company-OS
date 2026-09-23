import { db } from "../db/index.js";

function governanceDecision(companyId, capabilityKey) {
  const cap=db.prepare("SELECT * FROM ai_capabilities WHERE key=? AND active=1").get(capabilityKey);
  if(!cap) return {decision:"BLOCK",reason:"CAPABILITY_NOT_FOUND"};
  const policy=db.prepare("SELECT * FROM ai_policies WHERE (company_id=? OR company_id IS NULL) AND capability_key=? ORDER BY CASE WHEN company_id IS NULL THEN 1 ELSE 0 END, updated_at DESC LIMIT 1").get(companyId,capabilityKey);
  if(policy) return {decision:policy.effect==="ALLOW"?"ALLOW":policy.effect==="ESCALATE"?"ESCALATE":"BLOCK",reason:policy.reason||"Policy personalizada"};
  if(Number(cap.requires_approval)===1 || ["MEDIUM","HIGH","CRITICAL"].includes(String(cap.risk_level).toUpperCase())) return {decision:"ESCALATE",reason:"Capability exige aprovação pela política de risco."};
  return {decision:"ALLOW",reason:"Capability de baixo risco."};
}

export { governanceDecision };
