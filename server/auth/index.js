import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { db } from "../db/index.js";

export function sign(user) {
  return jwt.sign(
    { sub:user.id, role:user.role, companyId:user.company_id || null, tokenVersion:Number(user.token_version || 0) },
    JWT_SECRET,
    { expiresIn:"12h", issuer:"ai-company-os", audience:"ai-company-os-api" }
  );
}
export function auth(req,res,next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return res.status(401).json({error:"AUTH_REQUIRED"});
  try {
    const claims = jwt.verify(h.slice(7), JWT_SECRET, { issuer:"ai-company-os", audience:"ai-company-os-api" });
    const current = db.prepare("SELECT id, active, token_version FROM users WHERE id=?").get(claims.sub);
    if (!current || !current.active || Number(current.token_version || 0) !== Number(claims.tokenVersion || 0)) {
      return res.status(401).json({error:"INVALID_TOKEN"});
    }
    req.user = claims;
    next();
  } catch { return res.status(401).json({error:"INVALID_TOKEN"}); }
}
export function master(req,res,next) {
  auth(req,res,()=> req.user.role === "MASTER" ? next() : res.status(403).json({error:"MASTER_REQUIRED"}));
}

