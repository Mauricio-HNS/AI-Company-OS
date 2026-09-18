# Azure Production Blueprint

This directory defines the production cloud target for AI Company OS.

## Target architecture

```text
GitHub Pages
    ↓
Next.js static UI

Azure
├── Container Apps / App Service
│   └── Company Brain API (.NET 8)
├── Azure Database for PostgreSQL
│   └── Company events + memory + runtime state
├── Azure OpenAI
│   └── LLM gateway
├── Blob Storage
│   └── Documents / evidence
└── Key Vault
    └── Secrets / credentials
```

## Migration strategy

The current API uses SQLite as a development persistence provider. Production storage is deliberately isolated behind the cloud persistence boundary so the runtime does not depend on SQLite-specific behavior.

Production deployment should use environment variables / managed identity for configuration. Secrets must not be committed to the repository.

## Planned Azure resources

- `ai-company-os-api`: Company Brain API
- `ai-company-os-db`: PostgreSQL Flexible Server
- `ai-company-os-ai`: Azure OpenAI resource
- `ai-company-os-storage`: Blob Storage account
- `ai-company-os-kv`: Key Vault

## Production requirements

Before enabling real customer workloads:

1. PostgreSQL provider implemented and migrated.
2. Database migrations automated.
3. Managed Identity enabled where supported.
4. API secrets moved to Key Vault.
5. HTTPS-only ingress enforced.
6. Authentication and authorization expanded from device API keys to tenant/device claims.
7. Rate limiting and request-size limits enabled.
8. Structured logs, metrics and traces enabled.
9. Backups and retention configured.
10. LLM calls routed through a provider abstraction with budget and audit controls.

Azure resources are intentionally described as a production target in this repository. Creating paid cloud resources or credentials requires explicit deployment/account configuration outside source control.
