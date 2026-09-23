import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

export function sign(user) { return jwt.sign({ sub:user.id, role:user.role, companyId:user.company_id || null }, JWT_SECRET, { expiresIn:"12h" }); }
export function auth(req,res,next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return res.status(401).json({error:"AUTH_REQUIRED"});
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { return res.status(401).json({error:"INVALID_TOKEN"}); }
}
export function master(req,res,next) {
  auth(req,res,()=> req.user.role === "MASTER" ? next() : res.status(403).json({error:"MASTER_REQUIRED"}));
}

