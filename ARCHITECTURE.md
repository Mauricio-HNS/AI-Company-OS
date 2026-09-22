# AI Company OS — Architecture

## Product structure

```text
AI COMPANY OS
├── Presentation
│   ├── Landing
│   ├── Login
│   ├── Register
│   └── Forgot / Reset Password
├── Platform
│   ├── Portfolio
│   ├── Company Selector
│   ├── User Profile
│   └── Notifications
└── Company OS
    ├── Company Shell
    ├── Dashboard
    ├── AI Workforce
    │   ├── Agents
    │   ├── Missions
    │   └── Tasks
    ├── Business
    │   ├── Marketing
    │   ├── Customers
    │   ├── Products
    │   └── Finance
    ├── Intelligence
    │   ├── Intelligence
    │   └── Knowledge
    └── System
        ├── Operations
        │   └── Scheduling Engine
        ├── Integrations
        ├── Security
        └── Settings
```

## Scheduling Engine

Scheduling is a generic company capability, not a vertical-specific calendar. It models appointments, reservations, deliveries, visits, services, meetings and tasks against people, rooms, vehicles and equipment.

```text
Business Intent
      ↓
Scheduling Intent
      ↓
Resource Availability
      ↓
Conflict Detection
      ↓
Scheduling Proposal
      ↓
Human / AI / Integration confirmation
      ↓
Operational Event
```

The scheduling layer is intentionally decoupled from a traditional calendar UI. A future AI agent can create or update scheduling events as a consequence of orders, services, deliveries, customer requests or missions.

## Dependency direction

```text
UI / Presentation
        ↓
Application
        ↓
Domain
        ↓
Infrastructure
        ↓
Data / external services
```

Route files in `app/` are composition roots. They should select infrastructure data, compose application services/providers and render UI components. Business rules must not be embedded in route components.

## Current boundaries

- `domain/` — stable business types and concepts.
- `application/` — use-case boundaries. `CompanyRuntimeService` is the runtime entry point for UI orchestration.
- `infrastructure/` — company catalog and future persistence/integrations.
- `ui/` — product presentation boundaries and reusable company shell/navigation concerns.
- `app/` — Next.js routing/composition and route-specific client adapters.
- `lib/` — legacy engines retained during migration; new UI code should reach them through application boundaries rather than importing engines directly.

## Server / Client rule

Server Components are the default.

```text
page.tsx / layout.tsx
        ↓
server composition
        ↓
client component only when interaction/state/browser APIs are required
```

`generateStaticParams()` belongs to server route files. Interactive components must remain separate client boundaries.

## Runtime ownership

`CompanyRuntime` is the single operational state source for a company. Modules consume runtime state; they do not create parallel operational realities.

```text
Company Runtime
├── agents
├── missions
├── tasks
├── events
├── metrics
├── learning
├── safety
└── memory
```

## Design system ownership

Visual rules are centralized in the existing OS design layers. New modules must reuse the established shell, tokens, typography, states and interaction patterns instead of creating local navigation/chrome.

## Migration policy

This is an incremental refactor, not a rewrite. Existing engines remain operational while imports are progressively moved behind the domain/application/infrastructure/UI boundaries. Each migration must preserve the working product and keep the build green.

## Intent-first UX

The Company OS exposes decisions rather than internal software machinery. Top-level navigation stays intentionally small; repetitive work is handled by the AI workforce and appears as activity, outcomes or exceptions instead of buttons.

```text
Human intention
      ↓
Company Command Center
      ↓
AI Director
      ↓
Agents / business systems / operations
      ↓
Execution
      ↓
Human only when a decision, approval or exception is required
```

A capability remains available when it represents a meaningful control surface. Internal entities such as customers, products, finance, knowledge, tasks and approvals should not automatically become permanent top-level navigation items.
