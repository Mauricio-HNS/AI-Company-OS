import type { SystemIntegritySnapshot } from '../realtime-contract';

export type IntegrityInput = {
  policyHealthy: boolean;
  auditHealthy: boolean;
  runtimeHealthy: boolean;
  externalActionsEnabled: boolean;
  financialActionsEnabled: boolean;
  destructiveActionsEnabled: boolean;
  lastEventAt?: string;
  eventSequence: number;
};

export function buildSystemIntegritySnapshot(input: IntegrityInput): SystemIntegritySnapshot {
  const degraded = !input.policyHealthy || !input.auditHealthy || !input.runtimeHealthy;
  return {
    status: degraded ? 'DEGRADED' : 'OPERATIONAL',
    policyIntegrity: input.policyHealthy ? 'INTACT' : 'DEGRADED',
    audit: input.auditHealthy ? 'ACTIVE' : 'DEGRADED',
    externalActions: input.externalActionsEnabled ? 'ENABLED' : 'BLOCKED',
    financialActions: input.financialActionsEnabled ? 'ENABLED' : 'BLOCKED',
    destructiveActions: input.destructiveActionsEnabled ? 'ENABLED' : 'BLOCKED',
    lastEventAt: input.lastEventAt,
    sequence: input.eventSequence,
  };
}

export const SYSTEM_INTEGRITY_RULES = {
  POLICY_FAILURE_DEGRADES_RUNTIME: 'Policy integrity failure must move the runtime out of normal operational state.',
  AUDIT_FAILURE_DEGRADES_RUNTIME: 'Audit failure must be visible and must not be hidden by the UI.',
  RUNTIME_FAILURE_DEGRADES_RUNTIME: 'Runtime health failure must be reflected in system integrity.',
  SECURITY_STATE_IS_OBSERVATIONAL: 'A frontend integrity indicator never grants execution authority.',
  FAIL_SAFE_EXTERNAL_SIDE_EFFECTS: 'Production transport must default external side effects to blocked when trusted state is unavailable.',
} as const;
