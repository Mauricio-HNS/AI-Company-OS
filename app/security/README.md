# AI Company OS Security Constitution

## Owner authorization rule

No critical action may be decided or executed autonomously.

An AI agent may analyze, recommend, prepare, simulate, and request approval. It may never approve its own critical action or bypass the owner's authorization.

Critical actions include financial transfers, bank-account changes, payments above policy limits, hiring/termination, permission changes, destructive operations, production deployment, security-policy changes, legal communications, contract signing, credential changes, administrator creation, and emergency-stop operations.

## Required runtime flow

`REQUEST → RISK ASSESSMENT → POLICY CHECK → OWNER APPROVAL → EXECUTE → VERIFY → AUDIT`

If owner approval is required and is absent, expired, invalid, or does not match the exact action parameters, execution MUST be blocked.

## Trust boundary

The browser is never an authority boundary. UI state, localStorage, cached approval state, and client-side checks cannot authorize a real operation.

Production authorization MUST be enforced server-side with authenticated owner identity, exact-action binding, expiration, replay protection, concurrency/idempotency controls, and immutable audit records.

## Design principle

**The AI can propose. The owner decides. The system enforces. The audit records.**
