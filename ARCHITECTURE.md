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
        ├── Integrations
        ├── Security
        └── Settings
```

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


## OS Core

AI Company OS now has an explicit shared foundation under `packages/os-core/`.

The OS Core is the authoritative home for platform-wide contracts and primitives that must not be reimplemented independently by Brain, Runtime, Bridge, Workforce, or future components.

Current areas:
- `identity/` — tenant, company, agent, and user context.
- `governance/` — risk, approval, policy, and authorization contracts.
- `execution/` — execution lifecycle and result contracts.
- `evidence/` — audit and provenance contracts.
- `observability/` — correlation context and diagnostics primitives.

### Dependency rule

Product-specific modules may depend on OS Core. OS Core must not depend on product-specific modules. Shared code is migrated incrementally only after references and ownership are verified.

The first migration makes `RiskLevel` an OS Core contract consumed by the operating engine and Brain decision layer. Existing business logic remains in its owning modules until each responsibility is explicitly migrated.

## Foundation, Capabilities and SDK

The platform is evolving toward three explicit shared layers:

- packages/foundation/ — system-wide contracts and primitives for identity, governance, execution, evidence and observability.
- packages/capabilities/ — shared operational capabilities such as execution, connectors, memory, planning and deployment; these are introduced only when a capability is genuinely shared. The shared capabilities now include `execution/`, `memory/` and `connectors/`.
- packages/sdk/ — extension contracts for agents, connectors, tools and skills once those extension points are stable.

packages/os-core/ is currently a compatibility facade over Foundation. It remains in place to avoid unnecessary churn while consumers migrate. No product-specific business logic is moved merely for structural symmetry.

### OSContext direction

Cross-cutting operations will progressively use a composed OS context carrying identity, execution, governance and provenance rather than passing unrelated identifiers independently. This will be introduced incrementally to avoid duplicating existing ExecutionContext and CorrelationContext contracts.


### Shared capabilities: Execution and Memory

`packages/capabilities/execution/` owns generic dependency-aware execution queue mechanics. The existing `lib/execution-queue.ts` remains as a compatibility adapter because the current Company Runtime task model includes product-specific planning states. This avoids forcing domain-specific statuses into the platform-wide execution contract.

`packages/capabilities/memory/` owns the generic evidence-backed memory record and lifecycle mechanics: creation, supersession, contestation and expiration handling. The existing `lib/company-memory.ts` remains as a compatibility adapter because Company Brain owns the company-specific storage, ingestion and reasoning around those records.

`packages/capabilities/connectors/` now owns the generic governed connector lifecycle and authorization-gated activation boundary. Existing `domain/company/company-discovery.ts`, Bridge connectors and `lib/integration-control.ts` remain in place because they contain company/domain/provider-specific contracts and behavior. No connector implementation was moved merely for structural symmetry.

`packages/capabilities/planning/` now owns generic planning-graph mechanics: dependency-aware ready-task resolution and graph validation. `lib/mission-generator.ts`, `lib/operating-engine.ts` and `lib/replanning-engine.ts` remain responsible for company objectives, mission generation, agent selection, risk policy and replanning heuristics.
