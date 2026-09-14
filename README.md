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

> **Phase 2 — Agent Engine: COMPLETED**
>
> The project now has a complete simulation-first agent operating layer. The company workspace can run autonomous cycles, coordinate agents, manage dependent tasks, use a simulated tool registry, publish decision summaries, update memory, score performance and protect external actions behind permissions.

### Phase 1 — Interface & Simulation · COMPLETED

- [x] Welcome / presentation experience
- [x] Login and recovery interface
- [x] Master / Portfolio Dashboard
- [x] Company dashboards
- [x] Multi-company structure
- [x] Responsive premium command-center UI
- [x] Persistent simulation company creation
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

### Phase 3 — Company Engine · NEXT

- [ ] Persistent company data model
- [ ] Objectives and strategy engine
- [ ] Budgets and financial ledger
- [ ] Products and pricing model
- [ ] Customer model
- [ ] KPI engine
- [ ] Risk model
- [ ] Company-wide persistence

### Phase 4 — Autonomous Operations

- [ ] Production planning engine
- [ ] Mission generation
- [ ] Real task delegation
- [ ] Opportunity detection
- [ ] Experiment management
- [ ] Result evaluation
- [ ] Continuous learning
- [ ] Next-plan generation

### Phase 5 — Real AI & Business Integrations

- [ ] LLM providers
- [ ] RAG / vector knowledge systems
- [ ] CRM integrations
- [ ] Marketing integrations
- [ ] Financial integrations
- [ ] Communication channels
- [ ] Controlled external actions

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

## Phase 2 Agent Engine

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

The simulated company currently exposes permission-aware capabilities for planning, knowledge retrieval, research, CRM, analytics, finance and external actions. Financial and external side effects remain gated.

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

## Product Surface

### Master Dashboard

The portfolio layer provides:

- Multiple companies
- Revenue and profit
- AI workforce
- Active missions
- Company health
- Portfolio intelligence
- Company creation and simulation

### Company Dashboard

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

---

## Safety Model

The current project is intentionally **simulation-first**.

Real-world side effects are not connected to the Phase 2 engine. The interface already models the controls that will protect future execution:

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
│   ├── welcome/
│   ├── login/
│   ├── recovery/
│   ├── portfolio/
│   └── company/
│       └── [companyId]/
│           ├── page.tsx
│           ├── CompanyWorkspace.tsx
│           ├── company.css
│           └── phase2.css
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
INTERFACE & SIMULATION  ✓
          │
          ▼
AGENT ENGINE             ✓  CURRENTLY COMPLETE
          │
          ▼
COMPANY ENGINE           ← NEXT
          │
          ▼
AUTONOMOUS OPERATIONS
          │
          ▼
REAL AI MODELS
          │
          ▼
BUSINESS INTEGRATIONS
          │
          ▼
AUTONOMOUS COMPANIES
```

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
