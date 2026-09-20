# AI Company OS Foundation

The Foundation defines platform-wide contracts that every AI Company OS capability can rely on.

## Principles

- tenant and company isolation
- explicit governance and authorization
- traceable execution
- evidence and provenance
- correlation across distributed operations

Foundation contains contracts and primitives, not company-specific business logic.

## Transition

packages/os-core remains the compatibility layer while shared contracts migrate incrementally into Foundation. Product modules should prefer Foundation for new cross-cutting contracts.
