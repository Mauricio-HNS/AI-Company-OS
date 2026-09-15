/**
 * AI Company OS — Owner Authorization Policy
 *
 * Constitutional security rule:
 * No critical action may be decided or executed autonomously.
 * The owner must explicitly authorize the exact critical operation.
 *
 * This module is a frontend/domain contract only. Production enforcement
 * MUST happen on a trusted server/API, never in the browser or localStorage.
 */

export const OWNER_AUTHORIZATION_POLICY_VERSION = '1.0';

export type CriticalAction =
  | 'TRANSFER_FUNDS'
  | 'CHANGE_BANK_ACCOUNT'
  | 'PAYMENT_ABOVE_LIMIT'
  | 'HIRE_OR_TERMINATE'
  | 'CHANGE_PERMISSIONS'
  | 'DELETE_DATA'
  | 'DELETE_COMPANY'
  | 'PRODUCTION_DEPLOY'
  | 'CHANGE_SECURITY_POLICY'
  | 'LEGAL_COMMUNICATION'
  | 'SIGN_CONTRACT'
  | 'CHANGE_CREDENTIALS'
  | 'CREATE_ADMIN'
  | 'EMERGENCY_STOP';

export type AuthorizationDecision = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface OwnerAuthorizationRequest {
  id: string;
  companyId: string;
  action: CriticalAction;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string;
  reason: string;
  parametersHash: string;
  policyVersion: string;
  decision: AuthorizationDecision;
  decidedBy?: string;
  decidedAt?: string;
}

/** Critical operations always require an explicit owner decision. */
export function requiresOwnerAuthorization(action: CriticalAction): true {
  void action;
  return true;
}

/**
 * Approval is valid only for the exact request and only before expiration.
 * A server must independently verify owner identity and authorization state.
 */
export function isAuthorizationUsable(
  request: OwnerAuthorizationRequest,
  now = Date.now(),
): boolean {
  return request.decision === 'APPROVED' && Date.parse(request.expiresAt) > now;
}

/**
 * Agents can propose critical operations but can never self-approve them.
 */
export const AGENT_CRITICAL_ACTION_RULE =
  'AGENTS_MAY_PROPOSE_CRITICAL_ACTIONS_BUT_MAY_NEVER_APPROVE_OR_EXECUTE_THEM_WITHOUT_OWNER_AUTHORIZATION';

/**
 * Production invariant:
 * frontend approval state is informational; the trusted backend is the
 * only authority capable of authorizing execution.
 */
export const PRODUCTION_ENFORCEMENT_RULES = [
  'OWNER_IDENTITY_MUST_BE_VERIFIED_SERVER_SIDE',
  'APPROVAL_MUST_REFERENCE_THE_EXACT_ACTION_AND_PARAMETERS',
  'APPROVAL_MUST_EXPIRE',
  'AGENTS_CANNOT_APPROVE_THEIR_OWN_REQUESTS',
  'APPROVAL_CANNOT_BE_REPLAYED',
  'EXECUTION_MUST_BE_AUDITED',
  'FAILED_OR_UNVERIFIED_POLICY_CHECKS_MUST_BLOCK_EXECUTION',
] as const;
