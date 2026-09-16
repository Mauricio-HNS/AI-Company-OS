# Generic Company Onboarding

The first experience must be Company Discovery, not a preselected industry dashboard.

## Flow

```text
CREATE COMPANY
     ↓
DISCOVERY
     ↓
IDENTIFY DATA SOURCES
     ↓
MAP BUSINESS ENTITIES
     ↓
IDENTIFY GAPS
     ↓
AUTHORIZE CONNECTORS
     ↓
BUILD COMPANY LEDGER
     ↓
COMPANY BRAIN BASELINE
     ↓
FIRST OBSERVATIONS
     ↓
FIRST DECISIONS
```

The owner may have:

- an ERP;
- a POS;
- CRM;
- e-commerce;
- Excel or Google Sheets;
- local databases;
- local software without an API;
- documents only;
- no structured system at all.

The product must support all of these without assuming technical knowledge.

## No-system mode

When no structured system exists, Discovery switches to assisted conversational onboarding. The AI collects operational facts, vocabulary, suppliers, products/services, pricing, recurring work and business rules. These facts are explicitly marked as manually supplied and receive an appropriate confidence level.

## Company profile

Industry is a discovered attribute, not a hard-coded runtime branch.

```ts
interface CompanyProfile {
  companyId: string;
  industry?: string;
  size?: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'UNKNOWN';
  locations: string[];
  businessModel?: string;
  discoveredEntities: string[];
  activeSources: string[];
}
```

The same Company OS runtime can therefore onboard a workshop, restaurant, clinic, retailer, manufacturer, service provider or another business without changing the core architecture.
