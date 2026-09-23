import test from "node:test";
import assert from "node:assert/strict";
import { app, db } from "../app.js";
import { id, now } from "../core/utils.js";

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


test("end-to-end company lifecycle completes successfully", async (t) => {
  const masterResponse = await fetch("http://127.0.0.1:" + port + "/api/auth/master", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({email: "master@aicompanyos.local", password: "ChangeMe123!"})
  });
  assert.equal(masterResponse.status, 200);
  const masterAuth = await masterResponse.json();
  const masterToken = masterAuth.token;
  const authHeaders = {"content-type": "application/json", authorization: "Bearer " + masterToken};

  const companyResponse = await fetch("http://127.0.0.1:" + port + "/api/master/companies", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "E2E Autonomous Demo " + Date.now(),
      type: "SaaS",
      country: "Spain",
      revenue: 120000
    })
  });
  assert.equal(companyResponse.status, 201);
  const company = await companyResponse.json();

  const workforceResponse = await fetch("http://127.0.0.1:" + port + "/api/master/companies/" + company.id + "/workforce", {
    headers: {authorization: "Bearer " + masterToken}
  });
  assert.equal(workforceResponse.status, 200);
  const workforce = await workforceResponse.json();
  assert.ok(workforce.length >= 7);
  assert.ok(workforce.some((agent) => agent.role === "AI Company Manager"));
  assert.ok(workforce.some((agent) => agent.role === "Product & Technology Manager"));

  const inviteResponse = await fetch("http://127.0.0.1:" + port + "/api/master/companies/" + company.id + "/invites", {
    method: "POST",
    headers: authHeaders,
    body: "{}"
  });
  assert.equal(inviteResponse.status, 201);
  const invite = await inviteResponse.json();

  const clientEmail = "e2e-" + Date.now() + "@example.local";
  const signupResponse = await fetch("http://127.0.0.1:" + port + "/api/auth/client/signup", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({
      inviteToken: invite.token,
      name: "E2E Client",
      email: clientEmail,
      password: "ClientPass123!"
    })
  });
  assert.equal(signupResponse.status, 200);
  const clientAuth = await signupResponse.json();
  assert.equal(clientAuth.company.id, company.id);

  const clientLoginResponse = await fetch("http://127.0.0.1:" + port + "/api/auth/client/login", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({email: clientEmail, password: "ClientPass123!"})
  });
  assert.equal(clientLoginResponse.status, 200);
  const clientLogin = await clientLoginResponse.json();
  const clientHeaders = {
    "content-type": "application/json",
    authorization: "Bearer " + clientLogin.token
  };

  const ticketResponse = await fetch("http://127.0.0.1:" + port + "/api/support/tickets", {
    method: "POST",
    headers: clientHeaders,
    body: JSON.stringify({
      subject: "E2E support request",
      description: "Validate the autonomous support flow",
      priority: "Normal"
    })
  });
  assert.equal(ticketResponse.status, 201);
  const ticket = await ticketResponse.json();

  const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
  db.prepare("INSERT INTO invoices VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id(), company.id, null, "E2E-" + Date.now(), "OPEN",
    yesterday, yesterday, 1000, 0, 1000, 0, now(), now()
  );

  const analysisResponse = await fetch("http://127.0.0.1:" + port + "/api/master/companies/" + company.id + "/super-agent/analyze", {
    method: "POST",
    headers: authHeaders,
    body: "{}"
  });
  assert.equal(analysisResponse.status, 200);
  const analysis = await analysisResponse.json();
  assert.equal(analysis.company.id, company.id);
  assert.ok(analysis.plan.id);
  assert.ok(analysis.needs.length >= 2);

  const planResponse = await fetch("http://127.0.0.1:" + port + "/api/master/plans/" + analysis.plan.id + "/execute", {
    method: "POST",
    headers: authHeaders,
    body: "{}"
  });
  assert.equal(planResponse.status, 202);
  const queued = await planResponse.json();
  assert.equal(queued.queued, true);
  assert.equal(queued.job.type, "PLAN_EXECUTION");

  const { processOneJob } = await import("../jobs/worker.js");
  const processed = await processOneJob("e2e-worker");
  assert.equal(processed.status, "COMPLETED");

  const jobResponse = await fetch("http://127.0.0.1:" + port + "/api/master/jobs/" + queued.job.id, {
    headers: {authorization: "Bearer " + masterToken}
  });
  assert.equal(jobResponse.status, 200);
  const job = await jobResponse.json();
  assert.equal(job.status, "COMPLETED");
  assert.equal(job.attempts, 1);

  const plansResponse = await fetch("http://127.0.0.1:" + port + "/api/master/companies/" + company.id + "/super-agent/plans", {
    headers: {authorization: "Bearer " + masterToken}
  });
  assert.equal(plansResponse.status, 200);
  const plans = await plansResponse.json();
  const executedPlan = plans.find((plan) => plan.id === analysis.plan.id);
  assert.equal(executedPlan.status, "EXECUTED");

  const missionsResponse = await fetch("http://127.0.0.1:" + port + "/api/master/companies/" + company.id + "/missions", {
    headers: {authorization: "Bearer " + masterToken}
  });
  assert.equal(missionsResponse.status, 200);

  const executionsResponse = await fetch("http://127.0.0.1:" + port + "/api/master/companies/" + company.id + "/executions", {
    headers: {authorization: "Bearer " + masterToken}
  });
  assert.equal(executionsResponse.status, 200);
  const executions = await executionsResponse.json();
  assert.ok(executions.length >= analysis.needs.length);

  const clientTicketsResponse = await fetch("http://127.0.0.1:" + port + "/api/support/tickets", {
    headers: {authorization: "Bearer " + clientLogin.token}
  });
  assert.equal(clientTicketsResponse.status, 200);
  const tickets = await clientTicketsResponse.json();
  assert.ok(tickets.some((item) => item.id === ticket.id));
});

const e2eServer = app.listen(0);
const port = e2eServer.address().port;
process.on("exit", () => e2eServer.close());
