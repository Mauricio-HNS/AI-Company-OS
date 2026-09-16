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

## Architecture

```text
Company
 ├── Objectives
 ├── Missions
 ├── Tasks
 ├── Agents
 │    ├── Capabilities
 │    ├── Risk limits
 │    └── Autonomy
 ├── Execution Queue
 ├── Experiments
 ├── Evaluation
 ├── Company Memory
 ├── Budget
 ├── Safety Monitor
 ├── Security
 └── Audit / Runtime State
```

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

### Company OS shell status — 2026-09-16

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
- Navigation model covers Dashboard, AI Workforce, Business, Intelligence and System areas
- Dashboard, topbar and sidebar typography scaled up for improved readability
- `npm run typecheck` remains available as a development validation command
- Legacy `CompanyRuntimeWorkspace.tsx` monolith removed from the active codebase after the V2 migration
- Next.js configured for static export with the repository base path `/AI-Company-OS`
- Missing runtime support modules restored for Agents, Tasks and Missions
- Dynamic Tasks route split into a Server Component route plus Client Component so static export can generate company paths
- GitHub Pages workflow hardened to build and deploy the static `out` artifact

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
GitHub Pages deployment           →
      ↓
Dashboard 2.0                    →
      ↓
Module extraction                 →
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
```

The active company route composes through `CompanyRuntimeWorkspaceV2`; the former workspace monolith has been removed.

## Development status

### Phase 1 — Platform foundation

Completed.

### Phase 2 — Agent engine

Completed.

### Phase 3 — Company engine

Completed.

### Phase 4 — Autonomous operations

In progress.

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

Remaining hardening work:

- Automated unit tests for critical runtime paths
- Durable persistence
- Human approval workflow UI
- Opportunity detection
- Production experiment management
- Real integrations
- Dashboard 2.0 visual refinement
- Module-level component extraction

### Phase 5 — Real AI and business integrations

Future.

- LLM providers
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
- GitHub Pages deployment

## Safety model

The project remains simulation-first. Real external side effects are not enabled by default.

The intended production sequence is:

```text
PLAN
 ↓
RISK CHECK
 ↓
BUDGET CHECK
 ↓
APPROVAL
 ↓
EXECUTION
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
