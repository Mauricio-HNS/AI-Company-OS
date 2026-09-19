# Agent Execution & Deployment Layer

This layer turns an approved business objective into a governed execution workflow at the company edge.

## Current milestone

The Company Bridge can now receive a tenant-scoped execution request and prepare an execution manifest locally. Code generation, validation, sandbox testing and deployment are represented as explicit actions.

Remote deployment is intentionally blocked until a deployment adapter and authorization workflow exist.

## Target lifecycle

```text
BUSINESS OBJECTIVE
      ↓
ORCHESTRATOR
      ↓
EXECUTION PLAN
      ↓
DISCOVER → GENERATE → VALIDATE
      ↓
SANDBOX TEST
      ↓
SECURITY / DATA REVIEW
      ↓
STAGE ARTIFACT
      ↓
HUMAN AUTHORIZATION
      ↓
DEPLOY TO CUSTOMER ENVIRONMENT
      ↓
HEALTH CHECK
      ↓
OBSERVE → REPAIR → ROLLBACK
```

## Customer API bridge scenario

Example objective:

> Build an API bridge between the customer's ERP and AI Company OS.

The future execution agent will create the connector specification, generate the adapter/API project, validate it, run it in an isolated environment, package the artifact and request deployment authorization. The customer-side Bridge will be the controlled execution boundary.

## Hard security boundary

The current implementation does not execute arbitrary shell commands, open inbound ports, or deploy remotely. Deployment remains denied by policy. This is intentional until the deployment adapter provides allowlisted targets, credentials isolation, audit events, health checks and rollback.

## Next implementation stages

1. Artifact workspace and deterministic packaging.
2. Static validation and sandbox runner.
3. Deployment target adapters (Docker/Windows service/cloud).
4. Approval token and signed deployment manifest.
5. Health check and automatic rollback.
6. Orchestrator integration so an agent can create and execute the complete plan.
