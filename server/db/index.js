import path from "node:path";
import Database from "better-sqlite3";
import { DATA_DIR } from "../config/paths.js";
import { SCHEMA } from "./schema.js";

export const db = new Database(path.join(DATA_DIR, "ai-company-os.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(SCHEMA);
