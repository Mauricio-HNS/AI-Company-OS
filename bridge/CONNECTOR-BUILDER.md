# Governed AI Connector Builder

The AI Company OS may generate connector adapters, but generated code is never trusted or activated automatically.

## Lifecycle

```text
DISCOVER
   ↓
DESCRIBE SOURCE
   ↓
PROPOSE CONNECTOR
   ↓
GENERATE ADAPTER
   ↓
STATIC VALIDATION
   ↓
SANDBOX TEST
   ↓
DATA-MINIMIZATION REVIEW
   ↓
HUMAN AUTHORIZATION
   ↓
ACTIVATE
   ↓
OBSERVE
```

## Connector contract

Every adapter implements `ICompanyConnector` and must expose:

- a stable identifier;
- a read/write capability declaration;
- an explicit source description;
- a discovery operation;
- evidence for every business fact;
- confidence for extracted facts.

## Hard boundaries

Generated connectors must not:

- scan arbitrary drives;
- upload arbitrary files;
- collect passwords, browser credentials, private keys or unrelated personal documents;
- disable security software;
- change third-party application data during discovery;
- open public inbound ports;
- execute arbitrary remote commands;
- activate without authorization.

## Local-first contract

The adapter should produce a `BusinessFact` after local parsing and minimization. Only the resulting business facts are eligible for the cloud outbox. Raw source files remain local unless a separate explicit workflow authorizes a specific file transfer.
