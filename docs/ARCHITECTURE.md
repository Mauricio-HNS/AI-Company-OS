# AI Company OS — Architecture

## 1. Control hierarchy
Master Control -> Super Agent / AI CEO -> AI Workforce -> Capabilities -> Governed Adapters.

Super Agent is the strategic orchestrator. AI Workforce performs specialized work. Governance is independent of planning and decides ALLOW, ESCALATE or BLOCK.

## 2. Runtime loop
Observe -> Understand -> Need -> Objective -> Capability analysis -> Plan -> Governance -> Mission -> Adapter execution -> Verification -> Evidence -> Learning -> Replan.

## 3. Tenant boundary
Every company has isolated ERP, CRM, support, workforce, missions, policies, memory and documents. Company identity, subscription and environment are separate concepts.

## 4. Execution boundary
No model output may call an external side effect directly. Model output becomes a proposed capability invocation. Governance evaluates it. Only an approved adapter may execute it.

## 5. Evidence
Every execution records input snapshot, output snapshot, verification result, status, timestamps and audit event.

## 6. Failure semantics
FAILED means adapter failure. FAILED_VERIFICATION means the adapter returned but the expected post-state was not achieved. BLOCKED_NO_CAPABILITY means no authorized implementation exists. PENDING_APPROVAL means a human decision is required.

## 7. Production direction
Development backend: Node + SQLite. Production target: .NET Company Brain + PostgreSQL + object storage + secrets management + governed integration adapters.
