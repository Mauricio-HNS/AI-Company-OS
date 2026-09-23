export const PORT = Number(process.env.PORT || 3000);
export const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production";
export const MASTER_EMAIL = process.env.MASTER_EMAIL || "master@aicompanyos.local";
export const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "ChangeMe123!";

export const NODE_ENV = process.env.NODE_ENV || "development";
export const APP_BASE_URL = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SMTP_HOST = process.env.SMTP_HOST || "";
export const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
export const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "";
export const PASSWORD_RESET_TTL_MINUTES = Math.min(Math.max(Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30), 10), 60);
