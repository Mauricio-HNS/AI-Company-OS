<div align="center">

# AI Company OS

### The Operating System for Autonomous Companies

**AI agents that plan, execute, measure, learn and operate businesses.**

[![Deploy to GitHub Pages](https://github.com/Mauricio-HNS/AI-Company-OS/actions/workflows/deploy.yml/badge.svg)](https://github.com/Mauricio-HNS/AI-Company-OS/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-orange)](https://mauricio-hns.github.io/AI-Company-OS/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-React-blue)](https://www.typescriptlang.org/)

**Observe → Decide → Execute → Measure → Learn → Repeat**

[Open the Demo](https://mauricio-hns.github.io/AI-Company-OS/) · [View the Repository](https://github.com/Mauricio-HNS/AI-Company-OS)

</div>

---

## Current Status

> **Phase 3 — Company Engine: COMPLETED**
>
> The project now includes the complete multi-company operating foundation: Master Control Center, tenant registry, company provisioning, tenant dashboards, company modules, client portal, AI workforce views, missions, tasks, finance, knowledge, operations, security and settings. The current platform remains simulation-first, with browser-local persistence for provisioned tenants and no live external business side effects.

### Phase 1 — Interface & Simulation · COMPLETED

- [x] Welcome / presentation experience
- [x] Login and recovery interface
- [x] Master / Portfolio Dashboard
- [x] Company dashboards
- [x] Multi-company structure
- [x] Responsive premium command-center UI
- [x] Persistent-in-session simulation company creation
- [x] Simulated authentication session
- [x] GitHub Pages deployment configuration

### Phase 2 — Agent Engine · COMPLETED

- [x] Agent registry
- [x] Agent roles, goals and responsibilities
- [x] Live agent runtime states
- [x] Agent performance / efficiency scoring
- [x] Agent memory state
- [x] Tool registry with permission states
- [x] Dependency-aware task queue
- [x] Task execution state machine
- [x] Agent-to-agent communication model
- [x] Persistent-in-session decision history
- [x] Decision summaries and evaluation results
- [x] Autonomous execution loop simulation
- [x] Mission progression
- [x] Runtime pause / resume controls
- [x] Knowledge learning cycles
- [x] Security and approval gates
- [x] Real-money action protection
- [x] Agent detail screens
- [x] Mission detail screens
- [x] Task detail screens

### Phase 3 — Company Engine · COMPLETED

- [x] Master Control Center / Portfolio Dashboard
- [x] Multi-company tenant registry
- [x] Company provisioning flow
- [x] Provisioned tenant persistence in browser localStorage
- [x] Provisioned tenant dashboard
- [x] Tenant module navigation
- [x] AI Workforce module
- [x] Missions module
- [x] Tasks module
- [x] Products module
- [x] Customers module
- [x] Finance module
- [x] Intelligence module
- [x] Knowledge & Memory module
- [x] Operations module
- [x] Security module
- [x] Settings module
- [x] Company-specific module detail screens
- [x] Client Portal
- [x] Master view of provisioned companies
- [x] Company health, revenue, profit, agents and mission metrics
- [x] Company objectives and strategic direction UI
- [x] Risk and permission visibility
- [x] GitHub Pages-compatible static/export-safe routing
- [x] Premium responsive command-center experience

### Phase 4 — Autonomous Operations · NEXT

- [ ] Production planning engine
- [ ] Real mission generation
- [ ] Real task delegation and orchestration
- [ ] Opportunity detection
- [ ] Experiment management
- [ ] Result evaluation engine
- [ ] Continuous learning with durable operational state
- [ ] Next-plan generation
- [ ] Human approval workflow for autonomous actions

### Phase 5 — Real AI & Business Integrations · FUTURE

- [ ] LLM providers
- [ ] RAG / vector knowledge systems
- [ ] CRM integrations
- [ ] Marketing integrations
- [ ] Financial integrations
- [ ] Communication channels
- [ ] Controlled external actions
- [ ] Production-grade business integrations

---

## What is AI Company OS?

AI Company OS is a platform for building **companies operated by coordinated AI agents**.

The product models an entire company instead of a single chatbot: objectives, missions, tasks, agents, tools, finance, customers, knowledge, intelligence, operations, security and performance.

The long-term operating loop is:

```text
OBJECTIVE
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

Humans define direction, constraints, permissions and risk boundaries. The AI workforce operates inside those boundaries.

---

## Current Product Surface

### Master Control Center

The portfolio layer provides:

- Multiple companies
- Company health
- Revenue and profit
- AI workforce totals
- Active missions
- Portfolio-level visibility
- Company provisioning
- Navigation into each company environment

### Company Control Center

Every company has its own operating environment:

- Command Center
- Agents
- Missions
- Tasks
- Products
- Customers
- Finance
- Intelligence
- Knowledge & Memory
- Operations
- Security
- Settings

### Provisioned Tenant Dashboard

New companies can be initialized from the Master Control Center with:

- Company identity
- Sector and market
- Operating model
- Strategic objective
- Core AI workforce
- Company modules
- Client portal entry point
- Company health and operating metrics

Provisioned tenants currently persist in browser localStorage because the application is deployed as a static GitHub Pages experience. A server-side database is not yet connected.

### Client Portal

Each provisioned company can expose a separate client-facing portal surface for viewing its operational environment without using the Master Control Center.

---

## Agent Engine

The current simulation represents the company as a coordinated workforce.

```text
                    COMPANY OBJECTIVE
                           │
                           ▼
                       CEO AGENT
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
              RESEARCH          FINANCE
                  │                 │
                  ▼                 ▼
              PRODUCT ─────────► SALES
                  │
                  ▼
               RESULTS
                  │
                  ▼
              EVALUATION
                  │
                  ▼
                MEMORY
                  │
                  └────────► NEXT PLAN
```

### Agent runtime states

```text
IDLE → PLANNING → EXECUTING → OBSERVING → LEARNING → IDLE
```

### Task lifecycle

```text
BACKLOG → PLANNING → EXECUTING → OBSERVING → COMPLETED
                       │
                       └──── dependency / approval gate
```

### Tool registry

The simulated company exposes permission-aware capabilities for planning, knowledge retrieval, research, CRM, analytics, finance and external actions. Financial and external side effects remain gated.

### Agent communication

Agents exchange structured operational events such as:

```text
CEO → Product     T-1041 / Delegated
Research → CEO    SIGNAL-88 / Published
CFO → CEO         RISK-17 / Advisory
Product → Sales   EXP-41 / Coordinating
```

The UI exposes action summaries rather than private chain-of-thought.

### Company memory

Learning cycles add validated patterns and runtime observations to the simulated company memory layer. The next planning cycle can consume those patterns.

---

## Safety Model

The current project is intentionally **simulation-first**.

Real-world side effects are not connected to the current engine. The interface already models the controls that will protect future execution:

- Human approval gates
- Permission-aware tools
- Financial action gating
- External action gating
- Risk visibility
- Simulation mode
- Explicit real-money control

---

## Architecture Direction

```text
┌──────────────────────────────────────────────────────────────┐
│                       AI COMPANY OS                          │
├──────────────────────────────────────────────────────────────┤
│ MASTER / PORTFOLIO                                           │
│                                                              │
│   COMPANY A       COMPANY B       COMPANY C                  │
│      │               │               │                       │
│   CEO / AGENTS    CEO / AGENTS    CEO / AGENTS              │
│      │               │               │                       │
│ Objectives · Missions · Tasks · Tools · Results              │
│ Memory · Knowledge · KPIs · Finance · Risk · Learning        │
└──────────────────────────────────────────────────────────────┘
```

### Technology direction

- Frontend: Next.js / React / TypeScript
- AI services: Python / FastAPI
- LLM layer: provider-independent architecture
- Knowledge: RAG + vector search
- Infrastructure: cloud-native services
- Containers: Docker
- Data: relational + vector storage
- Observability: metrics, traces and execution history

---

## Project Structure

```text
AI-Company-OS/
├── app/
│   ├── master/
│   │   ├── page.tsx
│   │   ├── new/
│   │   └── tenant/
│   ├── portal/
│   ├── company/
│   │   └── [companyId]/
│   │       ├── page.tsx
│   │       ├── CompanyWorkspace.tsx
│   │       ├── agents/[agentId]/
│   │       ├── missions/[missionId]/
│   │       ├── tasks/[taskId]/
│   │       ├── products/[productId]/
│   │       ├── customers/[customerId]/
│   │       ├── finance/[financeId]/
│   │       ├── intelligence/[insightId]/
│   │       ├── knowledge/[knowledgeId]/
│   │       ├── operations/[operationId]/
│   │       ├── security/[securityId]/
│   │       └── settings/[settingId]/
│   └── ...
├── lib/
│   └── tenant-registry.ts
├── public/
├── .github/workflows/
├── next.config.mjs
└── README.md
```

---

## Development Philosophy

### 1. The company is the product

The core asset is the combination of structure, memory, workflows, tools, metrics and accumulated learning.

### 2. Agents have responsibilities

Every agent has a role, goal, context, tools, tasks, memory and measurable performance.

### 3. Everything becomes measurable

Missions create tasks. Tasks produce results. Results are evaluated against objectives.

### 4. Simulation before autonomy

The operating model is validated safely before real-world execution is connected.

### 5. Human control where it matters

Permissions, budgets, approvals and risk controls remain part of the architecture.

---

## Roadmap

```text
INTERFACE & SIMULATION  ✓ COMPLETED
          │
          ▼
AGENT ENGINE             ✓ COMPLETED
          │
          ▼
COMPANY ENGINE           ✓ COMPLETED
          │
          ▼
AUTONOMOUS OPERATIONS    ← NEXT
          │
          ▼
REAL AI & BUSINESS INTEGRATIONS
          │
          ▼
AUTONOMOUS COMPANIES
```

### Phase status

| Phase | Status | Focus |
|---|---|---|
| Phase 1 | COMPLETED | Interface, simulation and platform foundation |
| Phase 2 | COMPLETED | Agent Engine and autonomous-cycle simulation |
| Phase 3 | COMPLETED | Company Engine, multi-company control and client portal |
| Phase 4 | NEXT | Real autonomous operations and orchestration |
| Phase 5 | FUTURE | Real AI models and business integrations |

---

## Demo

**Live prototype:** https://mauricio-hns.github.io/AI-Company-OS/

**Repository:** https://github.com/Mauricio-HNS/AI-Company-OS

---

## Vision

> **The next generation of software will not only help people operate companies. It will help companies operate themselves.**

AI Company OS is being built toward an environment where humans define direction, constraints and permissions while an AI workforce continuously observes the business, discovers opportunities, executes authorized work, measures outcomes and learns what to do next.

<div align="center">

## AI Company OS

**Observe. Decide. Execute. Learn.**

</div>
