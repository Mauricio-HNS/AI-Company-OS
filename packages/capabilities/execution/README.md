# Execution Capability

The Execution Capability defines the generic execution queue contract used by operational runtimes.

It owns reusable execution mechanics, not company-specific planning or business rules.

Current scope:
- generic execution task contract
- dependency-aware readiness
- execution lifecycle transitions
- retry/attempt tracking
- queue insertion

The existing lib/execution-queue.ts remains the compatibility adapter for the current Company Runtime while consumers migrate incrementally.
