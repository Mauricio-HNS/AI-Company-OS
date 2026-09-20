# AI Company OS

AI Company OS is an AI-native operating system for companies operated by coordinated agents.

The project is built around one deterministic control loop:

```text
OBJECTIVE
   ↓
MISSION
   ↓
PLAN
   ↓
DELEGATE
   ↓
EXECUTE
   ↓
OBSERVE
   ↓
EVALUATE
   ↓
LEARN
   ↓
REPLAN
   └──────────► NEXT CYCLE
```

Humans define objectives, constraints, permissions and risk boundaries. Agents operate inside those boundaries and every execution produces observable state, evaluation and learning.

## Core objective — operate a real company through the OS

The long-term product rule is that AI Company OS must evolve from an agent-management platform into an operational control plane capable of taking an authorized real company as a client and progressively making that company operable through the OS.

Given explicit authorization and scoped access, the system must be designed to understand the company environment, discover systems and processes, design required integrations, build APIs/bridges/connectors, validate and test them, request and verify authorization, deploy into the authorized customer environment, perform health checks, activate, monitor, detect and correct failures, and roll back when required.

This is a product requirement and architectural north star, not permission for unrestricted autonomous access. Every real-world action must remain tenant-scoped, explicitly authorized, auditable, reversible where possible, and protected by the platform security, risk, budget and safety controls. The OS must never assume that access to one system grants access to another.

A concrete target scenario is: a customer asks the OS to integrate with an existing ERP or business system; the OS discovers the authorized interface, builds the required API/bridge, tests it, prepares the deployment package, deploys it through an approved deployment adapter into the authorized customer environment, verifies health, and then makes the resulting capability available to the appropriate agents.


## Program documentation

The complete product vision, real-company operating scenario, integration/deployment model, governance principles and implementation direction are documented in [`docs/PROGRAM-VISION.md`](docs/PROGRAM-VISION.md).


## Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         AI COMPANY OS                               │
│                                                                      │
│  HUMAN CONTROL PLANE                                                │
│  Objectives · Constraints · Permissions · Approvals · Risk Limits   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    COMPANY RUNTIME                            │    │
│  │                                                              │    │
│  │ Objective → Mission → Plan → Delegate → Execute             │    │
│  │                         │                                    │    │
│  │                         ▼                                    │    │
│  │              Observe → Evaluate → Learn → Replan             │    │
│  └─────────────────────────┬────────────────────────────────────┘    │
│                            │                                         │
│          ┌─────────────────┼──────────────────┐                      │
│          ▼                 ▼                  ▼                      │
│    AI WORKFORCE      COMPANY BRAIN      CONTROL SYSTEMS              │
│    Agents / Skills   Facts / Memory     Risk / Budget / Safety      │
│                       RAG / Reasoning    Autonomy / Audit            │
│                            ▲                                         │
│                            │                                         │
│  ┌─────────────────────────┴────────────────────────────────────┐    │
│  │                    CLOUD CONTROL PLANE                       │    │
│  │                                                              │    │
│  │ Enrollment → Device Identity → Authenticated Ingress         │    │
│  │             → Validation → Idempotency → Durable Store       │    │
│  └─────────────────────────▲────────────────────────────────────┘    │
│                            │ HTTPS                                  │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
                    outbound HTTPS only
                             │
┌────────────────────────────┴─────────────────────────────────────────┐
│                         CUSTOMER ENVIRONMENT                          │
│                                                                      │
│  ERP / SQLite / CSV / Local Systems                                  │
│             │                                                        │
│             ▼                                                        │
│       COMPANY BRIDGE                                                 │
│       Discovery · Read-only Connectors · Local Policy                │
│       Data Minimization · Local Outbox · Device Identity             │
│                                                                      │
│  RAW DATA → BUSINESS FACTS → MINIMIZATION → LOCAL OUTBOX             │
│                                                                      │
│  Raw local files/databases remain local unless explicitly authorized.│
└──────────────────────────────────────────────────────────────────────┘
```

### Production cloud target

```text
                         AZURE
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Azure Container Apps / App Service                               │
│              │                                                    │
│              ▼                                                    │
│       Company Brain API                                           │
│              │                                                    │
│      ┌───────┼───────────────┬───────────────┐                    │
│      ▼       ▼               ▼               ▼                    │
│ PostgreSQL  Azure OpenAI   Blob Storage   Key Vault               │
│ Memory +    LLM Gateway    Documents +    Secrets +               │
│ Events                     Evidence        Credentials             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTPS
                              │
                       Company Bridge
                              ▲
                              │
                    Customer local systems
```

Azure is the **production target architecture**. The current repository implementation still uses SQLite for development persistence; production Azure resources are not provisioned from source control.

### Architectural layers

| Layer | Purpose | State |
|---|---|---|
| Human Control Plane | Direction, constraints, permissions and approvals | Active |
| Company Runtime | Deterministic operating cycle | Active |
| AI Workforce | Agents, capabilities, delegation and execution | Active foundation |
| Company Brain | Business facts, memory, reasoning and future RAG | Ingress foundation |
| Control Systems | Risk, safety, budget, autonomy and audit | Active foundation |
| Cloud Control Plane | Enrollment, authentication, validation and durable events | Implemented |
| Company Bridge | Local-first connection to company systems | Implemented foundation |
| Azure Production Infrastructure | API, PostgreSQL, OpenAI, Blob and Key Vault | Blueprint ready |
| Real AI Layer | LLM gateway, RAG and autonomous reasoning | In progress |
| Business Integrations | CRM, ERP, finance, communication and external APIs | Next |
| Controlled Actions | Real-world side effects behind policy and approval gates | Future production layer |

### End-to-end architecture

```text
LOCAL COMPANY SYSTEMS
        ↓
COMPANY BRIDGE
        ↓
CONNECTORS + LOCAL POLICY
        ↓
BUSINESS FACTS
        ↓
DATA MINIMIZATION
        ↓
LOCAL OUTBOX
        ↓
HTTPS + DEVICE IDENTITY
        ↓
COMPANY BRAIN API
        ↓
AUTHENTICATION + VALIDATION
        ↓
EVENT IDENTITY + IDEMPOTENCY
        ↓
DURABLE CLOUD STORE
        ↓
COMPANY BRAIN
        ↓
LLM / RAG / AGENTS
        ↓
MISSION + PLAN
        ↓
RISK + BUDGET + APPROVAL
        ↓
CONTROLLED EXECUTION
        ↓
OBSERVE + EVALUATE
        ↓
COMPANY MEMORY
        ↓
REPLAN
```

This architecture separates the customer's local data boundary, the cloud ingestion boundary, the cognitive layer and the operational control loop. The public Next.js application remains a static presentation layer; the real cloud control plane is implemented separately as a .NET service.

## Company Bridge — local-first company connection

Company Bridge is the Windows component that connects a real company's local environment to the Company Brain without treating the customer's computer as a cloud data dump.

The Bridge is installed as the Windows service `AI Company OS Company Bridge Service`. A desktop shortcut is only a management entry point; deleting it does not stop the service.

### Data boundary

```text
RAW LOCAL DATA
      ↓
LOCAL PARSING
      ↓
BUSINESS FACTS
      ↓
MINIMIZATION
      ↓
LOCAL OUTBOX
      ↓
ONLY REQUIRED DATA → CLOUD
```

Raw files and complete local databases remain on the customer's machine unless a separate explicit workflow authorizes a specific transfer.

The first connectors are read-only SQLite and CSV adapters. Connector authorization is empty by default. Generated connectors must follow the governed lifecycle in `bridge/CONNECTOR-BUILDER.md` and cannot be activated merely because AI generated code.

## Real cloud boundary

The cloud side is a separate .NET 8 service under `cloud/CompanyBrain.Api/` because the public Next.js application is a static GitHub Pages export.

```text
Bridge
  ↓ HTTPS + device identity
POST /api/bridge/v1/sync
  ↓
Device authentication
  ↓
JSON validation
  ↓
SHA-256 event identity
  ↓
SQLite durable persistence
  ↓
Idempotent event storage
  ↓
Company Brain processing boundary
```

Device enrollment is explicit. An enrollment token provisions a device-specific API key; the cloud stores only the API-key hash. The API key is then used for authenticated synchronization. No company can synchronize while remaining `un-enrolled`.

## Runtime engines

| Module | Responsibility |
|---|---|
| `operating-engine.ts` | Objectives, task graphs, agent selection and risk approval |
| `mission-generator.ts` | Converts objectives into executable missions |
| `execution-queue.ts` | Dependency-aware task execution state machine |
| `company-runtime.ts` | Coordinates the complete operating cycle |
| `evaluation-engine.ts` | Evaluates results and produces learning records |
| `statistical-evaluation-engine.ts` | Statistical experiment evaluation and evidence-based verdicts |
| `replanning-engine.ts` | Creates the next executable plan after evaluation |
| `risk-engine.ts` | Quantitative impact, reversibility and blast-radius risk |
| `safety-monitor.ts` | Independent anomaly monitoring and kill-switch decisions |
| `budget-engine.ts` | Budget reservations, TTL and controlled consumption |
| `experiment-engine.ts` | Controlled experiment lifecycle and variant isolation |
| `autonomy-engine.ts` | Capability-level autonomy and failure-based decay |
| `company-memory.ts` | Evidence-backed knowledge with supersession and contestation |

## Control principles

### Evidence before declaring a winner

Experiments do not become winners from a simple percentage increase. The statistical layer checks sample size, confidence interval and significance before returning:

```text
SIGNIFICANT_WIN
SIGNIFICANT_LOSS
INCONCLUSIVE
INVALID
```

### Independent safety monitor

Safety is outside the normal evaluation loop:

```text
EXECUTION
 ├── Runtime
 └── Safety Monitor
       ├── NORMAL
       ├── WARNING
       ├── PAUSE
       ├── ABORT_TASK
       ├── ABORT_EXPERIMENT
       └── EMERGENCY_STOP
```

A safety anomaly can stop execution without waiting for the current operating cycle to finish.

### Quantitative risk

Risk is modeled from measurable factors:

```text
riskScore = impact × (1 - reversibility) × blastRadius
```

High-impact operations require the appropriate approval boundary.

### Autonomy with decay

Autonomy is granted per capability/domain. Execution failures can reduce autonomy instead of allowing it to increase indefinitely.

### Budget reservations

Financial capacity is reserved before execution and protected by TTL. Expired reservations are released instead of remaining indefinitely locked.

### Company Memory

The shared Memory capability owns the generic evidence-backed lifecycle; Company Brain remains responsible for company-specific storage, ingestion and reasoning.

Knowledge is stored with evidence and lifecycle state:

```text
ACTIVE → SUPERSEDED
       ↘ CONTESTED
```

The system can therefore distinguish current knowledge from historical or disputed knowledge.

## Current UI

The Company Workspace is runtime-driven rather than simulation-driven. The Command Center consumes the same runtime state used by execution, evaluation and replanning.

The UI exposes:

- Command Center
- AI Workforce
- Missions
- Task Graph
- Intelligence
- Company Memory
- Operations
- Security & Control
- Finance
- Products
- Customers
- Settings

### Company OS shell status — 2026-09-18

The canonical Company OS presentation shell is active on the company route.

Completed in this UI hardening cycle:

- Centralized Company navigation model in `ui/company/CompanyNavigation.ts`
- Reusable collapsible `CompanySidebar`
- Collapsed sidebar state with compact navigation mode
- Reusable `CompanyTopbar`
- User profile menu and session-aware sign-out boundary
- Canonical `CompanyContent` presentation boundary
- Extracted runtime-driven dashboard and business modules into `CompanyRuntimeContent`
- Composed `CompanyRuntimeWorkspaceV2` activated by the company route
- Server-first `CompanyShell`
- Runtime composition kept separate from the presentation shell
- Company route composition retains `generateStaticParams()` in the Server Component
- Dashboard includes revenue, conversion rate, AI workforce, active missions, company health, performance, funnel and live activity
- Dashboard, topbar and sidebar typography scaled up for improved readability
- Legacy `CompanyRuntimeWorkspace.tsx` monolith removed from the active codebase after the V2 migration
- Next.js configured for static export with the repository base path `/AI-Company-OS`
- Missing runtime support modules restored for Agents, Tasks and Missions
- Dynamic Tasks route split into a Server Component route plus Client Component so static export can generate company paths
- GitHub Pages workflow hardened to build and deploy the static `out` artifact
- Company Bridge local-first Windows service foundation added
- Read-only SQLite and CSV connectors added
- Local minimization and explicit connector authorization added
- Durable local outbox and outbound-only cloud sync added
- Governed AI connector-builder lifecycle documented
- Real .NET cloud ingress service added
- Explicit device enrollment added
- Device-specific API keys with hashed cloud storage added
- Durable SQLite cloud event persistence added
- Event-level idempotency added
- Authenticated Bridge → Cloud synchronization added
- Azure production cloud blueprint added
- Real Company Brain event processor added
- Processed-event tracking and Company Memory persistence added
- Configurable LLM gateway added
- Background processing worker added
- Brain analysis endpoint secured with an admin key
- Brain analysis now consumes persisted Company Memory facts
- Authenticated Company Memory inspection endpoint added
- Structured Company Brain Decision Layer added
- Runtime Brain decision adapter added
- Human approval gate added before runtime execution
- Approved Brain decisions can enter the deterministic execution queue
- Authenticated runtime synchronization endpoint exposes approved decisions without external side effects
- Trusted Company Bridge pulls approved Brain decisions using device credentials
- Local Bridge runtime channel exposes approved decisions to the static workspace without exposing cloud secrets
- Browser runtime adapter merges approved cloud decisions with deterministic runtime state
- Brain execution queue preserves existing runtime state when appending decisions
- Completed Brain tasks are marked EXECUTED in runtime state
- LLM decisions constrained to non-side-effect action types
- Bounded Agent Execution service added for approved OBSERVE / PLAN decisions
- Explicit Agent Registry added with capability-to-agent mapping and deterministic autonomy/risk policy enforcement
- Agent execution outcomes persisted durably for recovery and audit
- Autonomous Company Brain cycle added: memory → decision → controlled approval → agent execution
- Low-risk decisions can be promoted automatically; higher-risk decisions remain human-gated
- Brain worker now drives the autonomous cycle continuously while preserving external-side-effect isolation
- Agent observations and recommended next steps are fed back into Company Memory for subsequent cycles
- Tenant/data provenance isolation enforced: devices are not treated as company identity, and data sources require explicit company binding
- Bridge sync rejects envelopes whose CompanyId does not match the authenticated tenant
- Company Memory now stores source identity, source type and originating device provenance
- Brain ingestion validates tenant identity before creating memory and rejects mismatched envelopes
- Brain decision generation now filters out memories with missing or mismatched tenant/source/device provenance
- Brain decisions persist the exact memory/source/device evidence used to derive each decision
- Existing SQLite installations migrate memory and decision provenance columns automatically
- Execution outcome evaluation and autonomous replanning added to the continuous Brain cycle
- Evaluation results and replan proposals are persisted with company/decision/execution identity
- Replanning remains side-effect-free and approval-gated for HIGH/CRITICAL risk
- Approved decisions can execute through the LLM with read-only, no-side-effect constraints
- Agent execution validates structured COMPLETED / BLOCKED results before returning them
- Decision risk and approval requirements validated before persistence
- Brain decisions persisted durably with proposal / approval-required status
- Authenticated decision generation and inspection endpoints added
- Company Brain remains isolated from external side effects while decision controls are being hardened
- LLM gateway hardened with timeout and response validation
- Company Brain CI added for restore/build/publish verification

### Live preview

GitHub Pages deployment is configured at:

`https://mauricio-hns.github.io/AI-Company-OS/`

The deployment is considered live only after the GitHub Actions build and Pages deployment complete successfully.

Current sequence:

```text
Company OS Shell                  ✓
      ↓
Sidebar + Topbar integration      ✓
      ↓
Content / module boundaries       ✓
      ↓
Legacy workspace cleanup          ✓
      ↓
Pages build hardening             ✓
      ↓
Dashboard typography system       ✓
      ↓
Company Bridge foundation         ✓
      ↓
Real Company Brain ingress        ✓
      ↓
Device enrollment                 ✓
      ↓
Durable cloud persistence         ✓
      ↓
Azure production blueprint       ✓
      ↓
Real Company Brain processor      ✓
      ↓
LLM gateway                       ✓
      ↓
Structured Brain decisions          ✓
      ↓
Brain decision → approval → queue → execution   ✓
      ↓
Real agent/LLM execution          ✓
      ↓
Tenant/data provenance isolation       ✓
      ↓
Decision evidence provenance           ✓
      ↓
Evaluation + Replanning                 ✓
      ↓
Real integrations                 →
      ↓
Dashboard 2.0                     →
      ↓
Experience Intelligence           →
      ↓
Production hardening              →
```

Every relevant implementation milestone must update this status section so the repository home remains the source of truth for project progress.

External side effects remain gated while the runtime and safety paths are being hardened.

## Project structure

```text
app/
├── company/[companyId]/
│   ├── CompanyRuntimeContext.tsx
│   ├── CompanyRuntimeWorkspaceV2.tsx
│   ├── CompanyRuntimeWorkspaceV2.module.css
│   ├── CompanySessionGate.tsx
│   └── domain modules / detail routes
│
ui/
└── company/
    ├── CompanyShell.tsx
    ├── CompanyNavigation.ts
    ├── CompanySidebar.tsx
    ├── CompanySidebar.module.css
    ├── CompanyTopbar.tsx
    ├── CompanyTopbar.module.css
    ├── CompanyContent.tsx
    ├── CompanyContent.module.css
    └── CompanyRuntimeContent.tsx

lib/
├── company-runtime.ts
├── company-engine.ts
├── operations-engine.ts
├── operating-engine.ts
├── mission-generator.ts
├── execution-queue.ts
├── evaluation-engine.ts
├── statistical-evaluation-engine.ts
├── replanning-engine.ts
├── risk-engine.ts
├── safety-monitor.ts
├── budget-engine.ts
├── experiment-engine.ts
├── autonomy-engine.ts
└── company-memory.ts

bridge/
├── README.md
├── CONNECTOR-BUILDER.md
├── installer/
└── src/CompanyBridge/

cloud/
├── azure/
│   └── README.md
└── CompanyBrain.Api/
    ├── CompanyBrain.Api.csproj
    ├── Program.cs
    ├── AgentRegistry.cs
    ├── CloudStore.cs
    └── appsettings.json
```

The active company route composes through `CompanyRuntimeWorkspaceV2`; the former workspace monolith has been removed.

### Foundation / OS Core

Completed:

- Shared platform foundation created under `packages/foundation/`.
- Identity, governance, execution, evidence and observability contracts centralized.
- `packages/os-core/` retained as a compatibility facade during migration.
- First runtime consumers migrated from OS Core to Foundation.
- Company authorization contracts centralized without moving business logic out of `lib/`.
- Composed `OSContext` contract added for tenant, company, actor, execution, governance, correlation and provenance context.

Current direction:

`Foundation → Capabilities → SDK`, with migrations performed incrementally and existing product architecture preserved.

First shared capability extracted:
- `packages/capabilities/execution/` — generic dependency-aware execution queue mechanics and lifecycle transitions.
- `lib/execution-queue.ts` remains the Company Runtime compatibility adapter because its current task model contains product-specific planning states.
- `packages/capabilities/memory/` — generic evidence-backed memory lifecycle and status transitions.
- `lib/company-memory.ts` remains a compatibility adapter over the shared Memory capability.
- `packages/capabilities/connectors/` — governed connector lifecycle and authorization-gated activation.
- Existing Bridge/domain connector implementations remain in their current owners.

## Development status

### Phase 1 — Platform foundation

Completed.

### Phase 2 — Agent engine

Completed.

### Phase 3 — Company engine

Completed.

### Phase 4 — Autonomous operations

In progress.

Latest completed control-loop milestone:

**EXECUTE → OBSERVE → EVALUATE → LEARN → REPLAN → NEXT DECISION**

The autonomous loop now persists evaluation/replan state and converts a bounded replan into the next tenant-scoped Brain decision. Low-risk replans can be auto-approved; higher-risk replans remain approval-gated.

Completed foundations:

- Deterministic planning
- Mission generation
- Capability-based delegation
- Dependency-aware execution queue
- Result evaluation
- Statistical experiment evaluation
- Learning records
- Replanning
- Quantitative risk engine
- Safety monitor / kill switch
- Budget reservations with TTL
- Experiment isolation
- Capability autonomy and decay
- Company memory lifecycle
- Runtime-driven Command Center
- Company OS presentation architecture
- Centralized navigation and shell boundaries
- Active composed Company Workspace
- Static Pages build hardening
- Company Bridge local-first ingestion foundation
- Real authenticated cloud Bridge ingress
- Device enrollment
- Durable cloud event persistence
- Event idempotency
- Tenant/data provenance isolation across devices and sources
- Decision evidence provenance
- Durable evaluation and replan persistence
- Replan → next decision/task loop
- Approved decision resume/execute cycle

Remaining hardening work:

- Automated unit tests for critical runtime paths
- PostgreSQL production provider
- Direct cloud-to-Company-Brain agent decision loop ✓
- Durable agent execution result store
- Authenticated cloud decision → runtime synchronization contract ✓
- Runtime pull endpoint for approved Brain decisions ✓
- Trusted Bridge → browser runtime decision delivery ✓
- Human approval workflow UI
- Opportunity detection
- Production experiment management
- Agent registry, capabilities and explicit autonomy policies ✓
- Shared Foundation contracts and OSContext ✓
- Real integrations
- Dashboard 2.0 visual refinement
- Module-level component extraction
- Production observability and rate limiting

### Phase 5 — Real AI and business integrations

In progress.

- Production LLM provider configuration
- Agent decision loop
- RAG / vector knowledge
- CRM
- Marketing platforms
- Financial systems
- Communication channels
- Controlled external actions

## Technology

- Next.js 14
- React 18
- TypeScript
- Lucide React
- .NET 8 Company Bridge
- .NET 8 Company Brain API
- SQLite development persistence
- Azure production blueprint
- GitHub Pages deployment

## Safety model

The platform now has a real authenticated data-ingestion path, while real external business side effects remain gated.

The intended production sequence is:

```text
REAL COMPANY DATA
 ↓
LOCAL MINIMIZATION
 ↓
LOCAL OUTBOX
 ↓
AUTHENTICATED CLOUD INGRESS
 ↓
BRAIN VALIDATION
 ↓
PLAN
 ↓
RISK CHECK
 ↓
BUDGET CHECK
 ↓
APPROVAL
 ↓
CONTROLLED EXECUTION
 ↓
SAFETY MONITOR
 ↓
MEASUREMENT
 ↓
EVALUATION
 ↓
MEMORY
 ↓
REPLAN
```

## Vision

> The next generation of software will not only help people operate companies. It will help companies operate themselves.

AI Company OS is being built toward that control plane: humans define direction and boundaries; an AI workforce continuously plans, executes, measures, learns and replans inside them.
