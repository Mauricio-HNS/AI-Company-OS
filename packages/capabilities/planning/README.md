# Planning Capability

The Planning capability provides generic planning-graph mechanics shared by Company Runtime and future planning components.

It owns:
- dependency-aware planning task contracts
- ready-task resolution
- graph validation

It does not own:
- company objectives
- mission templates
- agent selection
- risk policy
- business-specific planning heuristics
- replanning decisions

Those remain in the existing Company Runtime engines.
