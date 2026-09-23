import test from "node:test";
import assert from "node:assert/strict";
import { app, db } from "../app.js";
import { hashToken, safeJson } from "../core/utils.js";

test("backend boots with the canonical database schema", async (t) => {
  const required = [
    "companies",
    "users",
    "support_tickets",
    "invoices",
    "crm_leads",
    "ai_agents",
    "ai_orchestrators",
    "ai_capabilities",
    "ai_plans",
    "ai_plan_steps",
    "ai_missions",
    "ai_execution_runs",
    "ai_policies",
    "audit_log"
  ];

  const tables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name)
  );

  for (const table of required) assert.ok(tables.has(table), `missing table: ${table}`);

  const server = app.listen(0);
  t.after(() => server.close());

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("x-request-id"));
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, "ai-company-os-server");
});
