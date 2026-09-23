import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { db } from "../db/index.js";
import { audit } from "../audit/index.js";
import { id, now, hashToken } from "../core/utils.js";
import {
  APP_BASE_URL,
  NODE_ENV,
  PASSWORD_RESET_TTL_MINUTES,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_FROM
} from "../config/env.js";

const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_RESET_TOKENS_PER_DAY = 8;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function rateKey(kind, value) {
  return hashToken(kind + ":" + String(value || ""));
}

function allowRate(rateKeyValue) {
  const t = Date.now();
  const current = db.prepare("SELECT * FROM password_reset_rate_limits WHERE rate_key=?").get(rateKeyValue);
  if (!current || t - Date.parse(current.window_started_at) >= REQUEST_WINDOW_MS) {
    const stamp = now();
    db.prepare(
      "INSERT INTO password_reset_rate_limits(rate_key,attempts,window_started_at,updated_at) VALUES(?,?,?,?) " +
      "ON CONFLICT(rate_key) DO UPDATE SET attempts=1,window_started_at=excluded.window_started_at,updated_at=excluded.updated_at"
    ).run(rateKeyValue, 1, stamp, stamp);
    return true;
  }
  if (current.attempts >= MAX_REQUESTS_PER_WINDOW) return false;
  db.prepare("UPDATE password_reset_rate_limits SET attempts=attempts+1,updated_at=? WHERE rate_key=?")
    .run(now(), rateKeyValue);
  return true;
}

function trustedResetUrl(token) {
  return APP_BASE_URL + "/client/?resetToken=" + encodeURIComponent(token);
}

async function sendResetEmail(user, resetUrl) {
  if (!SMTP_HOST || !SMTP_FROM) {
    if (NODE_ENV !== "production") return false;
    throw new Error("PASSWORD_RESET_EMAIL_NOT_CONFIGURED");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to: user.email,
    subject: "AI Company OS — recuperação de acesso",
    text:
      "Recebemos uma solicitação para redefinir sua senha. " +
      "Use este link dentro de " + PASSWORD_RESET_TTL_MINUTES + " minutos:\n\n" +
      resetUrl + "\n\nSe você não solicitou isso, ignore esta mensagem.",
    html:
      "<p>Recebemos uma solicitação para redefinir sua senha.</p>" +
      "<p><a href=\"" + resetUrl + "\">Redefinir minha senha</a></p>" +
      "<p>O link expira em " + PASSWORD_RESET_TTL_MINUTES +
      " minutos e pode ser usado uma única vez.</p>" +
      "<p>Se você não solicitou isso, ignore esta mensagem.</p>"
  });

  return true;
}

export async function requestPasswordReset({ email, role, ip }) {
  const normalized = normalizeEmail(email);
  const generic = {
    message: "Se esse endereço estiver cadastrado, enviaremos um link para redefinir a senha."
  };

  if (!normalized || !normalized.includes("@")) return generic;

  const accountKey = rateKey("email", normalized);
  const ipKey = rateKey("ip", ip || "unknown");
  if (!allowRate(accountKey) || !allowRate(ipKey)) return generic;

  const user = db.prepare(
    "SELECT * FROM users WHERE lower(email)=? AND role=? AND active=1"
  ).get(normalized, role);

  if (!user) return generic;

  const recent = db.prepare(
    "SELECT COUNT(*) count FROM password_reset_tokens WHERE user_id=? AND created_at>=datetime('now','-1 day')"
  ).get(user.id).count;

  if (Number(recent) >= MAX_RESET_TOKENS_PER_DAY) return generic;

  db.prepare("UPDATE password_reset_tokens SET used_at=? WHERE user_id=? AND used_at IS NULL")
    .run(now(), user.id);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000
  ).toISOString();

  db.prepare(
    "INSERT INTO password_reset_tokens(id,user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)"
  ).run(id(), user.id, tokenHash, expiresAt, now());

  try {
    const delivered = await sendResetEmail(user, trustedResetUrl(rawToken));
    audit(user.id, "PASSWORD_RESET_REQUESTED", "user", user.id, {
      role,
      delivered,
      ip: ip ? hashToken(ip).slice(0, 16) : null
    });

    if (NODE_ENV !== "production" && !delivered) {
      return { ...generic, devResetUrl: trustedResetUrl(rawToken), expiresAt };
    }
  } catch (error) {
    audit(user.id, "PASSWORD_RESET_EMAIL_FAILED", "user", user.id, {
      role,
      error: error.message
    });

    if (NODE_ENV !== "production") {
      return {
        ...generic,
        devResetUrl: trustedResetUrl(rawToken),
        expiresAt,
        emailWarning: "SMTP não configurado; link disponível apenas em desenvolvimento."
      };
    }
  }

  return generic;
}

export async function confirmPasswordReset({ token, newPassword }) {
  if (
    typeof newPassword !== "string" ||
    newPassword.length < 10 ||
    newPassword.length > 128
  ) {
    return { ok: false, status: 400, error: "INVALID_PASSWORD" };
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d).{10,128}$/.test(newPassword)) {
    return { ok: false, status: 400, error: "PASSWORD_POLICY" };
  }

  const tokenHash = hashToken(String(token || ""));
  const row = db.prepare(
    "SELECT * FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL"
  ).get(tokenHash);

  if (!row || Date.parse(row.expires_at) <= Date.now()) {
    return { ok: false, status: 400, error: "INVALID_OR_EXPIRED_RESET_TOKEN" };
  }

  const user = db.prepare(
    "SELECT * FROM users WHERE id=? AND active=1"
  ).get(row.user_id);

  if (!user) {
    return { ok: false, status: 400, error: "INVALID_OR_EXPIRED_RESET_TOKEN" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const stamp = now();

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE users SET password_hash=?, token_version=token_version+1 WHERE id=?"
    ).run(passwordHash, user.id);

    db.prepare(
      "UPDATE password_reset_tokens SET used_at=? WHERE id=? AND used_at IS NULL"
    ).run(stamp, row.id);

    db.prepare(
      "UPDATE password_reset_tokens SET used_at=? WHERE user_id=? AND used_at IS NULL"
    ).run(stamp, user.id);
  });

  tx();
  audit(user.id, "PASSWORD_RESET_COMPLETED", "user", user.id, {});
  return { ok: true };
}

export function inspectResetToken(token) {
  const row = db.prepare(
    "SELECT expires_at, used_at FROM password_reset_tokens WHERE token_hash=?"
  ).get(hashToken(String(token || "")));

  if (!row || row.used_at || Date.parse(row.expires_at) <= Date.now()) {
    return { valid: false };
  }

  return { valid: true, expiresAt: row.expires_at };
}
