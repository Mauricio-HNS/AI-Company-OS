export type RuntimeEventType =
  | 'SYSTEM_STATUS'
  | 'AGENT_STATE_CHANGED'
  | 'TASK_UPDATED'
  | 'DECISION_CREATED'
  | 'APPROVAL_REQUIRED'
  | 'ACTION_EXECUTED'
  | 'AUDIT_RECORDED'
  | 'SECURITY_ALERT';

export type SecurityGate = 'OPEN' | 'APPROVAL_REQUIRED' | 'BLOCKED';

export interface RuntimeEvent<T = unknown> {
  id: string;
  type: RuntimeEventType;
  companyId: string;
  occurredAt: string;
  sequence: number;
  source: 'SERVER' | 'AGENT' | 'USER' | 'INTEGRATION';
  correlationId: string;
  payload: T;
}

export interface SystemIntegritySnapshot {
  status: 'OPERATIONAL' | 'DEGRADED' | 'INCIDENT';
  policyIntegrity: number;
  audit: 'ACTIVE' | 'DEGRADED';
  externalActions: SecurityGate;
  financialActions: SecurityGate;
  destructiveActions: SecurityGate;
  lastEventAt: string;
  sequence: number;
}

/**
 * Frontend contract only. Production implementations must be backed by a
 * trusted server, authenticated transport and durable event/audit storage.
 * Never treat localStorage or client state as a security boundary.
 */
export const REALTIME_CONTRACT_VERSION = '1.0';
