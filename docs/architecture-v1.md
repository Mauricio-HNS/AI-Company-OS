# AI Company OS — Architecture v1.0

## 1. Core principle

AI Company OS is a company operating system, not an agent-centric chatbot.

> The AI may think broadly, propose broadly and act autonomously inside its authority. It may never grant authority to itself.

Execution is denied by default. Lack of authorization creates a review opportunity, not an automatic rejection, unless an explicit deny rule or hard security boundary applies.

## 2. Canonical operating flow

```text
REQUEST
  ↓
TRIAGE
  ↓
DECISION
  ↓
PLAN
  ↓
PLAN EVALUATION
  ↓
OPPORTUNITY / RISK ANALYSIS
  ↓
POLICY CHECK
  ├── ALLOW → ACTION → EXECUTION
  ├── REVIEW_REQUIRED → PROPOSAL → CENTRAL DE COMANDO
  ├── APPROVAL_REQUIRED → OWNER → ACTION → EXECUTION
  └── BLOCK → STOP
                         ↓
                      OUTCOME
                         ↓
                      EVALUATE
                         ↓
                      LEARN
                         ↓
                      REPLAN
```

## 3. Domain boundaries

### Company
Business identity, objectives, clients, domains, environments and governance context.

### Request
An incoming need, incident, client demand or operational signal. A request is not a task.

### Decision
Records the question, alternatives, selected path, rationale, evidence and confidence. A decision is not an authorization.

### Plan
Describes how an objective or decision will be pursued, including dependencies, cost, return, duration, risk and reversibility.

### Task
A unit of work produced by a plan. A task is not a side effect.

### Action
A concrete operation capable of creating a side effect. Every material action crosses the Policy Engine.

### Outcome
What actually happened after execution, measured separately from task completion.

### Agent
An actor with identity, role, tools, data scope, authority level and risk limits. Agents are never authority sources.

### Environment
Defines where an action operates and which domain is responsible. Examples: Production, Staging, Security, Financial, Customer, Internal and External.

### Policy
Defines what is allowed, denied or subject to conditions. Policy is enforced independently from AI reasoning.

### Authorization
A time-bound owner decision for an action that requires explicit approval. Authorization must bind to the exact action and parameters.

### Proposal
A recommendation sent for review. A proposal is never an authorization.

### Event
An immutable operational fact used for runtime coordination, realtime views, audit and analytics.

### Audit
The authoritative record of security-relevant and material operations.

### Memory
Operationally useful learned information with provenance, confidence and validation state.

### Knowledge
Reference information and source-backed content. Knowledge, memory and audit remain distinct.

## 4. Authority model

```text
L0 Observation
L1 Internal Operation
L2 External Action
L3 Sensitive Action
L4 Critical Action
L5 Absolute Control
```

Authority is evaluated by the Policy Engine. Urgency never grants authority.

## 5. Policy outcomes

| Decision | Execute now | Analyze | Owner review |
|---|---:|---:|---:|
| ALLOW | Yes | Optional | No |
| REVIEW_REQUIRED | No | Yes | When recommendation requires it |
| APPROVAL_REQUIRED | No | Yes | Yes |
| BLOCK | No | No execution | No override |

`BLOCK` is reserved for explicit denial or hard security boundaries.

## 6. Request routing

Requests are classified by:

- category
- priority
- client
- environment
- responsible domain
- impact
- risk
- SLA
- complexity
- dependencies

Priority levels:

- P0 — Emergency
- P1 — Critical
- P2 — High
- P3 — Normal
- P4 — Low

P0/P1 changes handling speed, never authority.

## 7. Side-effect boundary

Tasks may create actions. Actions create side effects.

```text
MISSION
  ↓
PLAN
  ↓
TASK
  ↓
ACTION
  ↓
POLICY ENGINE
  ↓
TOOL / INTEGRATION
```

This prevents a completed task from becoming implicit authorization to perform unrelated side effects.

Every side-effect action requires:

- action identity
- exact parameter binding
- authority context
- policy decision
- idempotency key
- correlation ID
- audit record

## 8. Decision and execution separation

The AI can recommend a decision without being allowed to execute it.

The system therefore separates:

```text
INTELLIGENCE
→ what should be done?

PLANNING
→ how should it be done?

POLICY
→ is it authorized?

AUTHORIZATION
→ who must approve it?

EXECUTION
→ perform the exact authorized action

OUTCOME
→ what actually happened?
```

## 9. Runtime architecture

The production target is:

```text
Frontend
   ↓
API / Gateway
   ↓
Authentication + Tenant Context
   ↓
Policy + Authorization
   ↓
Runtime Orchestrator
   ↓
Event Bus / Durable Event Store
   ├── Agents
   ├── Tasks
   ├── Finance
   ├── Security
   ├── Knowledge
   ├── Integrations
   └── Analytics
   ↓
Audit Store
```

The browser is never the authority boundary.

The current GitHub Pages implementation remains simulation-first. Production execution requires a trusted backend, durable persistence, authenticated identity, server-side policy enforcement and durable audit storage.

## 10. Event and trace model

Material operations should carry:

- `eventId`
- `sequence`
- `correlationId`
- `causationId`
- `requestId`
- `taskId`
- `actionId`
- `idempotencyKey`
- timestamp
- source

This enables realtime state, tracing, duplicate protection, failure recovery and audit reconstruction.

## 11. Learning model

The learning loop is outcome-driven:

```text
DECISION
  ↓
PLAN
  ↓
ACTION
  ↓
OUTCOME
  ↓
EVALUATION
  ↓
MEMORY / KNOWLEDGE UPDATE
  ↓
NEXT PLAN
```

Successful execution alone is not considered successful learning. The OS must compare expected and observed outcomes.

## 12. Non-negotiable rules

1. Autonomy does not mean authority.
2. Agents are actors, not authority sources.
3. Requests are not tasks.
4. Tasks are not actions.
5. Actions require policy evaluation.
6. Unauthorized execution is forbidden by default.
7. Unauthorized ideas may be analyzed unless explicitly blocked.
8. Explicit deny rules cannot be overridden by proposals.
9. Critical actions require owner authorization.
10. Authorization is bound to the exact action and parameters.
11. Urgency never overrides authority.
12. Knowledge, memory and audit are separate concerns.
13. Every material side effect is traceable and auditable.
14. Client-side state never authorizes production execution.
15. Policy changes require authorized governance.
16. No agent can create, elevate or modify its own authority.
