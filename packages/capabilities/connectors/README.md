# Connector Capability

The Connector capability defines the generic lifecycle and activation boundary for company-system connectors.

Lifecycle:

DISCOVER → DESCRIBE_SOURCE → PROPOSE → GENERATE → VALIDATE → SANDBOX_TEST → MINIMIZATION_REVIEW → AUTHORIZE → ACTIVATE → OBSERVE

The capability deliberately does not own:
- Company-specific discovery data
- ERP/CRM/provider implementations
- local Bridge parsing
- cloud persistence
- business-specific connector proposals

Those remain in domain, Bridge, application and infrastructure layers.

Activation is authorization-gated: a connector cannot be activated unless its status is AUTHORIZED.
