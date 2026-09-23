import crypto from "node:crypto";

export function now() {
  return new Date().toISOString();
}

export function id() {
  return crypto.randomUUID();
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function safeJson(value, fallback = []) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return fallback;
  }
}
