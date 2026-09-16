# AI Company OS — Company Bridge

Company Bridge is the local Windows agent that connects a company's computer environment to AI Company OS without uploading the company's entire filesystem or database.

## Principles

- Local-first processing.
- Explicit source authorization.
- Data minimization before cloud sync.
- Outbound HTTPS only; no inbound public port is required.
- Windows Service for continuous operation.
- Local API bound to `127.0.0.1` only.
- Connector adapters are isolated from the core runtime.
- Every sync produces an auditable manifest.
- External systems are never modified by discovery.
- AI-generated connectors must be validated before activation.

## Runtime

```text
Windows PC
  |
  +-- Company Bridge Service
       |
       +-- Local API (127.0.0.1)
       +-- Discovery Engine
       +-- Connector Runtime
       +-- Privacy / Minimization Engine
       +-- Local State Store
       +-- Sync Engine
              |
              | HTTPS outbound
              v
        AI Company OS Cloud
              |
              +-- Company Brain
              +-- Company Ledger
              +-- AI Decisions
              +-- Memory
```

## Security boundary

The Bridge never scans or uploads the entire machine. A source must be explicitly configured. Discovery reports metadata and capabilities first; data extraction is a separate authorized action.

The initial implementation includes safe connectors for local CSV/Excel-compatible tabular exports and SQLite read-only databases. Additional adapters can be added behind `ICompanyConnector`.

## Windows installation

Run the installer script from an elevated PowerShell prompt:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\installer\install-company-bridge.ps1
```

The installer publishes the service, registers `AI Company OS Company Bridge Service`, creates the application directory and creates a desktop shortcut to the local management page. The Windows service itself does not depend on that shortcut.

## Configuration

The service uses `appsettings.json` and environment variables. Never put cloud secrets in source control. Production enrollment should exchange a short-lived enrollment code for a device credential over HTTPS.

## Current scope

This first slice establishes the production-oriented local architecture. It does not claim that the cloud endpoint is already deployed. Until the cloud API is configured, sync records remain in the local outbox and no external side effect is performed.
