# Company Bridge — Generic Connector Architecture

Company Bridge is sector-agnostic. It must not contain business rules such as "borracharia", "restaurante" or "oficina" in its core ingestion layer.

## Principle

```text
ANY COMPANY
    ↓
DISCOVERY
    ↓
LOCAL CONNECTORS
    ↓
LOCAL PARSING
    ↓
NORMALIZATION
    ↓
PRIVACY / POLICY FILTER
    ↓
BUSINESS FACTS
    ↓
LOCAL OUTBOX
    ↓
ONLY REQUIRED DATA
    ↓
COMPANY BRAIN
```

## Supported source families

- API
- local database
- local application
- Excel / CSV / XML / JSON files
- documents and structured exports
- POS / device data
- manually supplied business information

New source adapters must implement a common connector contract and must declare:

- source identity;
- read/write capabilities;
- permissions;
- data classes produced;
- local transformations;
- fields allowed to leave the machine;
- health status;
- audit events.

## Generic business model

The Bridge does not decide the sector. It emits generic business facts such as:

- customer
- supplier
- product
- service
- sale
- purchase
- order
- inventory
- expense
- revenue
- payment
- invoice
- appointment
- asset
- document
- interaction
- event

Sector-specific meaning is resolved by the Company Brain after the source has been normalized.

## AI Connector Builder

The AI may propose an adapter when Discovery finds an unknown source:

```text
DISCOVER
   ↓
UNDERSTAND SOURCE
   ↓
PROPOSE MAPPING
   ↓
GENERATE ADAPTER
   ↓
STATIC VALIDATION
   ↓
SANDBOX TEST
   ↓
POLICY REVIEW
   ↓
HUMAN AUTHORIZATION
   ↓
ACTIVATE
```

AI-generated code is never activated merely because generation succeeded.

## Local-first privacy boundary

Raw customer databases and files remain local by default. The connector converts source records into the minimum business facts required by the authorized cloud capability.

Example:

```text
LOCAL RECORD
name + phone + vehicle + service + price + date

        ↓ local processing

CLOUD FACT
service + price + date + pseudonymous customer reference
```

If identity is unnecessary for a decision, it must not be included in the cloud payload.

## Multiple companies

The same Bridge product serves many sectors. A company-specific connector configuration is data/configuration, not a fork of the Bridge codebase.

```text
Company Bridge Runtime
        │
        ├── Company A configuration
        ├── Company B configuration
        ├── Company C configuration
        └── ...
```

The runtime stays generic while the Company Brain learns each company's vocabulary, processes and business model.
