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

## What is AI Company OS?

AI Company OS is a platform for building **companies operated by coordinated AI agents**.

Instead of creating another chatbot, the system models an entire company: objectives, departments, agents, missions, tasks, tools, finances, customers, knowledge and performance.

The long-term goal is to give a company an objective and let its AI workforce continuously:

- Observe the business
- Discover opportunities
- Plan missions
- Delegate tasks
- Execute authorized actions
- Measure results
- Learn from outcomes
- Generate the next plan

> **Humans define direction, constraints and permissions. The AI workforce operates the company within those boundaries.**

---

## The Autonomous Company Loop

```text
                    COMPANY OBJECTIVE
                           │
                           ▼
                         CEO AI
                           │
                           ▼
                         PLAN
                           │
                           ▼
                       MISSIONS
                           │
                           ▼
                         TASKS
                           │
                           ▼
                         AGENTS
                           │
                           ▼
                          TOOLS
                           │
                           ▼
                        RESULTS
                           │
                           ▼
                       EVALUATION
                           │
                           ▼
                        LEARNING
                           │
                           └──────────► NEXT PLAN
```

This is the core idea: **the company does not simply wait for prompts. It continuously operates toward measurable outcomes.**

---

# Product

## Master Dashboard

The global control layer for the operator.

- Multi-company portfolio
- Revenue and profit
- Costs and performance
- AI workforce
- Missions and activity
- Company health
- Portfolio-level intelligence

## Company Dashboard

Every company receives its own operating environment.

- Command Center
- Agents
- Missions
- Tasks
- Products
- Customers
- Finance
- Intelligence
- Knowledge
- Operations
- Security
- Settings

## Multi-Company Architecture

```text
MASTER OS
   │
   ├── COMPANY ALPHA
   │    ├── CEO AI
   │    ├── Departments
   │    └── AI Agents
   │
   ├── COMPANY BETA
   │    ├── CEO AI
   │    ├── Departments
   │    └── AI Agents
   │
   └── COMPANY GAMMA
        ├── CEO AI
        ├── Departments
        └── AI Agents
```

Each company can operate independently while the master layer provides portfolio-wide visibility.

---

# Interface Philosophy

The product is being built as a **premium AI command center**, not a conventional administration panel.

The interface is designed to make an autonomous company understandable at a glance:

```text
OBJECTIVES
    ↓
MISSIONS
    ↓
TASKS
    ↓
AI WORKFORCE
    ↓
TOOLS
    ↓
RESULTS
    ↓
KPIs
    ↓
LEARNING
    ↓
NEXT PLAN
```

The first development priority is the operating experience and simulation layer. Real execution comes later, behind permissions and controls.

---

# Current Status

### Phase 1 — Interface & Simulation

**In progress**

- [x] Welcome / presentation experience
- [x] Login and recovery interface
- [x] Master / Portfolio Dashboard
- [x] Company dashboards
- [x] Multi-company structure
- [x] AI workforce visualization
- [x] Mission and execution pipeline
- [x] KPI visualization
- [x] Live activity simulation
- [x] Autonomous loop visualization
- [x] GitHub Pages deployment
- [ ] Functional dashboard modules
- [ ] Persistent company creation
- [ ] Authentication backend

### Phase 2 — Agent Engine

- [ ] Agent roles and goals
- [ ] Agent memory
- [ ] Tool registry
- [ ] Task execution
- [ ] Agent communication
- [ ] Decision history
- [ ] Performance evaluation

### Phase 3 — Company Engine

- [ ] Objectives
- [ ] Strategy
- [ ] Budgets
- [ ] Revenue
- [ ] Costs
- [ ] Customers
- [ ] Products
- [ ] KPIs
- [ ] Risk management

### Phase 4 — Autonomous Operations

- [ ] Planning engine
- [ ] Mission generation
- [ ] Task delegation
- [ ] Opportunity detection
- [ ] Experiment management
- [ ] Result evaluation
- [ ] Continuous learning
- [ ] Next-plan generation

### Phase 5 — Real AI & Business Integrations

- [ ] LLM providers
- [ ] RAG / knowledge systems
- [ ] Business APIs
- [ ] CRM integrations
- [ ] Marketing integrations
- [ ] Financial integrations
- [ ] Communication channels
- [ ] Controlled external actions

Real-money and irreversible actions remain protected by explicit permissions, limits and safety controls.

---

# Example

Imagine a coffee shop with one objective:

> **Increase profit by 20%.**

The AI workforce could observe sales, inventory, suppliers, schedules, marketing, customers and costs.

It might discover that sales are weak between 14:00 and 16:00 and propose:

> **Coffee + cake for €4.50, Monday–Friday, 14:00–16:00, for 14 days.**

After authorization, specialized agents can coordinate the campaign, monitor the experiment and evaluate the result.

```text
EXPERIMENT #27

Additional sales        +382
Additional revenue      +€1,719
Additional cost           €612
Additional profit       +€1,107

RESULT: APPROVED
```

The result becomes knowledge for the next decision.

---

# Architecture Direction

```text
┌─────────────────────────────────────────────────────────────┐
│                     AI COMPANY OS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CEO / ORCHESTRATOR                                         │
│          │                                                  │
│          ├── Strategy                                       │
│          ├── Research                                       │
│          ├── Product                                        │
│          ├── Marketing                                      │
│          ├── Sales                                          │
│          ├── Finance                                        │
│          ├── Operations                                     │
│          └── Intelligence                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Objectives · Missions · Tasks · Agents · Tools · Results   │
├─────────────────────────────────────────────────────────────┤
│ Memory · Knowledge · KPIs · Finance · Risk · Learning      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Direction

- **Frontend:** Next.js / React / TypeScript
- **AI Services:** Python / FastAPI
- **LLM Layer:** Model-independent provider architecture
- **Knowledge:** RAG + vector search
- **Infrastructure:** Cloud-native services
- **Containers:** Docker
- **Data:** Relational + vector storage
- **Observability:** Metrics, traces and execution history

The production stack can evolve without changing the core company model.

---

# Design Principles

### 1. The company is the product

The valuable asset is the combination of company structure, memory, workflows, tools, metrics and accumulated learning.

### 2. Agents have responsibilities

An agent has a role, objective, context, tools, tasks and measurable performance.

### 3. Everything becomes measurable

Missions create tasks. Tasks produce results. Results are evaluated against objectives.

### 4. Simulation before autonomy

The system is developed in a safe simulated environment before real-world execution is connected.

### 5. Human control where it matters

Authorization boundaries, budgets, permissions and risk controls remain part of the architecture.

---

# Roadmap

```text
INTERFACE
    │
    ▼
SIMULATION
    │
    ▼
AGENT ENGINE
    │
    ▼
COMPANY ENGINE
    │
    ▼
AUTONOMOUS LOOP
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

# Project Structure

```text
AI-Company-OS/
│
├── app/
│   ├── welcome/
│   ├── login/
│   ├── recovery/
│   ├── portfolio/
│   └── company/
│       └── [companyId]/
│
├── components/
├── public/
├── .github/
│   └── workflows/
│
├── next.config.mjs
└── README.md
```

---

# Demo

### Live Prototype

**https://mauricio-hns.github.io/AI-Company-OS/**

### Repository

**https://github.com/Mauricio-HNS/AI-Company-OS**

---

# Vision

> **The next generation of software will not only help people operate companies. It will help companies operate themselves.**

AI Company OS is being built toward an environment where humans define direction, constraints and permissions while an AI workforce continuously observes the business, discovers opportunities, executes authorized work, measures outcomes and learns what to do next.

---

<div align="center">

## AI Company OS

**Observe. Decide. Execute. Learn.**

</div>
