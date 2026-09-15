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

> **Phase 4 — Autonomous Operations: IN PROGRESS**
>
> The platform now has deterministic production planning, mission generation, task orchestration, execution-queue primitives, evaluation/learning records and replanning primitives. The UI remains simulation-first and no real external business side effects are connected.

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

### Phase 4 — Autonomous Operations · IN PROGRESS

- [x] Production planning engine
- [x] Mission generation
- [x] Task delegation and capability-based agent selection
- [x] Deterministic execution queue primitives
- [x] Result evaluation engine
- [x] Learning record generation
- [x] Replanning primitives
- [ ] Opportunity detection
- [ ] Experiment management
- [ ] Durable operational state
- [ ] Human approval workflow in the UI
- [ ] Command Center integration with the production engine
- [ ] Automated tests for failure, blocking and replanning scenarios

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

## Autonomous Operations Engine

The production engine is being built around a deterministic control loop:

```text
OBJECTIVE
   ↓
MISSION GENERATOR
   ↓
TASK GRAPH
   ↓
AGENT SELECTION
   ↓
RISK / PERMISSION GATE
   ↓
EXECUTION QUEUE
   ↓
RESULT
   ↓
EVALUATION
   ↓
LEARNING
   ↓
REPLAN
   └──────────► NEXT CYCLE
```

Current runtime modules:

- `lib/operating-engine.ts` — objective, agent, task, risk and operating-plan primitives.
- `lib/mission-generator.ts` — converts an objective into a mission and dependency-aware task graph.
- `lib/execution-queue.ts` — deterministic `READY → EXECUTING → COMPLETED/FAILED/BLOCKED` queue primitives.
- `lib/evaluation-engine.ts` — evaluates task results and produces durable learning records.
- `lib/replanning-engine.ts` — selects failed/blocked work for the next operating cycle while reapplying risk gates.

The current implementation intentionally stops before real-world side effects. External tools will be connected only after the execution, approval and audit paths are integrated into the company runtime.

---

## What is AI Company OS?

AI Company OS is a platform for building **companies operated by coordinated AI agents**.

The product models an entire company instead of a single chatbot: objectives, missions, tasks, agents, tools, finance, customers, knowledge, intelligence, operations, security and performance.

Humans define direction, constraints, permissions and risk boundaries. The AI workforce operates inside those boundaries.

---

## Safety Model

The current project is intentionally **simulation-first**.

Real-world side effects are not connected to the current engine. The architecture keeps explicit controls for:

- Human approval gates
- Permission-aware tools
- Financial action gating
- External action gating
- Risk visibility
- Simulation mode
- Explicit real-money control

---

## Technology Direction

- Frontend: Next.js / React / TypeScript
- AI services: Python / FastAPI
- LLM layer: provider-independent architecture
- Knowledge: RAG + vector search
- Infrastructure: cloud-native services
- Containers: Docker
- Data: relational + vector storage
- Observability: metrics, traces and execution history

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
AUTONOMOUS OPERATIONS    ← IN PROGRESS
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
| Phase 4 | IN PROGRESS | Production planning, missions, orchestration, evaluation and replanning |
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
