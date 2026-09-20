# Planning Capability

Shared planning contracts for AI Company OS.

The planning capability separates AI proposal from human authorization. A plan can contain multiple alternatives, supporting details, risks, expected impact, cost and dependencies.

Human review supports:

- ACCEPT an option
- EDIT a plan before execution
- INTERVENE and take control
- REQUEST_MORE_ANALYSIS
- DELETE a proposal
- BLOCK an idea, plan or agent from retrying the same target

Blocking is represented as a durable policy input and is intentionally separate from simply deleting a proposal.

This capability does not execute external side effects. Approved reviews must still pass the normal governance, execution and deployment controls.
