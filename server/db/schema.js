export const SCHEMA = `
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  revenue REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CLIENT',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number INTEGER NOT NULL,
  company_id TEXT NOT NULL,
  requester_id TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'NOVO',
  sla_hours INTEGER NOT NULL DEFAULT 24,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  author_id TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(ticket_id) REFERENCES support_tickets(id)
);
CREATE TABLE IF NOT EXISTS support_attachments (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  uploaded_by TEXT,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(ticket_id) REFERENCES support_tickets(id)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'SERVICE',
  price REAL NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  next_billing_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  subscription_id TEXT,
  number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'OPEN',
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(subscription_id) REFERENCES subscriptions(id)
);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL DEFAULT 'OTHER',
  reference TEXT DEFAULT '',
  paid_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(invoice_id) REFERENCES invoices(id),
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  start_date TEXT,
  end_date TEXT,
  monthly_value REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS company_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  actor_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS crm_customers (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT DEFAULT '', phone TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS crm_leads (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT DEFAULT '', source TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'NEW', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS crm_opportunities (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL, customer_id TEXT, title TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0, stage TEXT NOT NULL DEFAULT 'OPEN', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id), FOREIGN KEY(customer_id) REFERENCES crm_customers(id)
);
CREATE TABLE IF NOT EXISTS ai_agents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'GENERAL',
  description TEXT DEFAULT '',
  autonomy TEXT NOT NULL DEFAULT 'OPERATIONAL',
  status TEXT NOT NULL DEFAULT 'READY',
  source TEXT NOT NULL DEFAULT 'AUTO',
  permissions TEXT DEFAULT '[]',
  tools TEXT DEFAULT '[]',
  goals TEXT DEFAULT '[]',
  kpis TEXT DEFAULT '[]',
  supervisor_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(supervisor_id) REFERENCES ai_agents(id)
);
CREATE TABLE IF NOT EXISTS ai_orchestrators (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  autonomy TEXT NOT NULL DEFAULT 'HIGH',
  objective TEXT DEFAULT '',
  last_analysis_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS ai_capabilities (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  description TEXT NOT NULL,
  action TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'LOW',
  requires_approval INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_plans (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  orchestrator_id TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  summary TEXT DEFAULT '',
  detected_needs TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(orchestrator_id) REFERENCES ai_orchestrators(id)
);
CREATE TABLE IF NOT EXISTS ai_plan_steps (

  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  capability_key TEXT,
  assigned_agent_id TEXT,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  requires_approval INTEGER NOT NULL DEFAULT 0,
  result TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(plan_id) REFERENCES ai_plans(id),
  FOREIGN KEY(capability_key) REFERENCES ai_capabilities(key),
  FOREIGN KEY(assigned_agent_id) REFERENCES ai_agents(id)
);
CREATE TABLE IF NOT EXISTS ai_missions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  plan_id TEXT,
  plan_step_id TEXT,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'GENERAL',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'PLANNED',
  assigned_agent_id TEXT,
  result TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(plan_id) REFERENCES ai_plans(id),
  FOREIGN KEY(plan_step_id) REFERENCES ai_plan_steps(id),
  FOREIGN KEY(assigned_agent_id) REFERENCES ai_agents(id)
);
CREATE TABLE IF NOT EXISTS ai_execution_runs (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  plan_step_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  capability_key TEXT,
  status TEXT NOT NULL,
  risk_level TEXT,
  input_snapshot TEXT DEFAULT '{}',
  output_snapshot TEXT DEFAULT '{}',
  verification TEXT DEFAULT '{}',
  error TEXT DEFAULT '',
  started_at TEXT NOT NULL,
  finished_at TEXT,
  FOREIGN KEY(plan_id) REFERENCES ai_plans(id),
  FOREIGN KEY(plan_step_id) REFERENCES ai_plan_steps(id),
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE IF NOT EXISTS ai_policies (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  capability_key TEXT NOT NULL,
  effect TEXT NOT NULL DEFAULT 'ALLOW',
  reason TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(capability_key) REFERENCES ai_capabilities(key)
);

`;
