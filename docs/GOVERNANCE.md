# AI Company OS — Governance

## Verdicts
- ALLOW: policy permits execution.
- ESCALATE: execution waits for human approval.
- BLOCK: execution is forbidden.

## Default risk policy
- READ and low-risk analysis: ALLOW.
- Planning: ALLOW.
- Internal writes: policy controlled.
- External communication: ESCALATE.
- Financial effects: ESCALATE.
- Contract effects: ESCALATE.
- Security and credential changes: ESCALATE.
- Destructive or irreversible operations: BLOCK.

## Invariants
1. Agents cannot modify governance policy during execution.
2. Tool adapters cannot bypass governance.
3. Company data is tenant-scoped.
4. Hard deletion of business entities is disabled.
5. Failed verification cannot be reported as success.
6. Every governed execution is auditable.

These principles are consistent with current research emphasizing architectural separation between planning, execution and governance. citeturn0search0turn0search3
