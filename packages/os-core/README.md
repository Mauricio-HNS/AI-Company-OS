# AI Company OS Core

The OS Core is the shared foundation of AI Company OS.

It contains stable, system-wide contracts and primitives that may be consumed by the Brain, Runtime, Bridge, Workforce, connectors, and future platform components.

## Rules

- Core must not depend on a product-specific runtime component.
- Shared code belongs here only when it represents a platform capability or contract.
- Business-specific behavior stays in its owning module.
- Tenant, authorization, risk, execution, evidence, and observability concerns must remain explicit.
- New shared code should be introduced here before being copied into multiple modules.

## Initial structure

- `identity/` — tenant/company/agent identity context.
- `governance/` — permissions, risk, approvals, and policy primitives.
- `execution/` — execution contracts and lifecycle primitives.
- `evidence/` — audit and provenance contracts.
- `observability/` — correlation and diagnostic context.

This package is intentionally small at first. Existing modules are migrated into it incrementally after reference and ownership analysis.
