import path from "node:path";
import Database from "better-sqlite3";
import { DATA_DIR } from "../config/paths.js";
import { SCHEMA } from "./schema.js";

export const db = new Database(path.join(DATA_DIR, "ai-company-os.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.exec(SCHEMA);


// Lightweight forward migrations for databases created by earlier versions.
const userColumns = db.prepare("PRAGMA table_info(users)").all().map((row) => row.name);
if (!userColumns.includes("token_version")) {
  db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0");
}
