import crypto from "node:crypto";
import { db } from "../db/index.js";

function now() { return new Date().toISOString(); }
function id() { return crypto.randomUUID(); }

export function audit(actorId, action, type, entity, payload = {}) {
  db.prepare("INSERT INTO audit_log VALUES (?,?,?,?,?,?,?)")
    .run(id(), actorId, action, type, entity, JSON.stringify(payload), now());
}
