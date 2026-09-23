# AI Company OS — Roadmap

## Now
- Stabilize Node backend.
- Split server.js into domain modules without changing APIs.
- Add automated integration tests.
- Add tenant isolation tests.
- Add governance tests.
- Add mission execution tests.

## Next
- Real ERP write adapters.
- CRM write adapters.
- Support action adapters.
- Workforce capability-gap provisioning.
- Bounded retry and repair missions.
- Automatic verification and replan.

## Then
- Company Brain memory and RAG.
- External communication adapters.
- Payment and billing integrations.
- Company Bridge connectors.

## Production
- PostgreSQL.
- Durable object storage.
- Secrets management.
- LLM gateway.
- Observability.
- Backups and disaster recovery.
- Deployment adapters with approval and rollback.

## Definition of done for autonomous execution
An autonomous action is not complete merely because an adapter returned success. It is complete only when governance allowed it, the adapter executed, the expected post-state was verified, evidence was persisted, and the result is visible to the operating cycle.
