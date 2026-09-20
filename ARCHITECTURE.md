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

## Progressive administrative autonomy

The Company OS is the operational system of the company, but administrative authority remains with the owner or responsible person. Autonomy is granted progressively from observed evidence; it is never assumed by the AI.

```text
Owner / Responsible
        ↓
Company policies, objectives, permissions and limits
        ↓
Company OS
        ↓
Observe → Analyze → Recommend → Approval → Limited autonomy → Operational autonomy
        ↓
Evidence + outcomes + audit
        ↺
```

Each company has its own autonomy policy. The policy records the current level, trust evidence, accepted/rejected recommendations and successful/failed executions.

The system may **recommend** an autonomy increase or reduction, but changing the company's administrative level requires explicit owner/admin acceptance. Negative outcomes can cause the system to recommend reducing autonomy.

Autonomy is bounded by permissions and policies. High-impact actions continue to require the appropriate human approval even when lower-risk operational actions are autonomous.

