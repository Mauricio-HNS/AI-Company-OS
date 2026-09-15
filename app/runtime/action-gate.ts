/**
 * AI Company OS — Action Gate
 *
 * Tasks describe work. Actions create side effects. Only actions cross the
 * authorization boundary, and only after the exact action has passed policy.
 *
 * This module is a frontend/domain contract. Production enforcement MUST run
 * on a trusted server/API with verified identity, durable state and audit.
 */

import {
  evaluatePolicy,
  type PolicyCheckInput,
  type PolicyDecisionResult,
  type PolicyRule,
} from '../security/policy-engine';
import {
  isAuthorizationUsable,
  type OwnerAuthorizationRequest,
} from '../security/owner-authorization';

export interface ActionGateInput extends PolicyCheckInput {
  taskId: string;
  parametersHash: string;
  idempotencyKey: string;
  correlationId: string;
  ownerAuthorization?: OwnerAuthorizationRequest;
}

export interface ActionGateResult extends PolicyDecisionResult {
  taskId: string;
  parametersHash: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface ExecutionReceipt {
  actionId: string;
  companyId: string;
  action: string;
  parametersHash: string;
  idempotencyKey: string;
  correlationId: string;
  authorizedAt: string;
  gateVersion: string;
}

export const ACTION_GATE_VERSION = '1.1';

export function evaluateActionGate(
  input: ActionGateInput,
  rules: PolicyRule[],
  now = Date.now(),
): ActionGateResult {
  const policy = evaluatePolicy(input, rules, now);

  return {
    ...policy,
    taskId: input.taskId,
    parametersHash: input.parametersHash,
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
  };
}

/**
 * Final domain-level execution boundary.
 *
 * APPROVAL_REQUIRED is intentionally different from BLOCK: an approved
 * critical operation may cross this boundary only when the approval is for
 * the exact company, action and parameters and is still valid.
 */
export function canExecuteAction(
  input: ActionGateInput,
  policy: PolicyDecisionResult,
  actionId: string,
  now = Date.now(),
): { allowed: boolean; reason: string; receipt?: ExecutionReceipt } {
  if (!input.taskId || !input.parametersHash || !input.idempotencyKey || !input.correlationId) {
    return { allowed: false, reason: 'Execution requires task, parameter, idempotency and correlation context.' };
  }

  if (policy.decision === 'BLOCK' || policy.decision === 'REVIEW_REQUIRED') {
    return { allowed: false, reason: `Policy decision ${policy.decision} cannot execute.` };
  }

  if (policy.decision === 'APPROVAL_REQUIRED') {
    const approval = input.ownerAuthorization;
    if (!approval) {
      return { allowed: false, reason: 'Explicit owner authorization is required.' };
    }
    if (approval.companyId !== input.companyId || approval.action !== input.action) {
      return { allowed: false, reason: 'Owner authorization does not match the exact company and action.' };
    }
    if (approval.parametersHash !== input.parametersHash) {
      return { allowed: false, reason: 'Owner authorization does not match the exact parameters.' };
    }
    if (!isAuthorizationUsable(approval, now)) {
      return { allowed: false, reason: 'Owner authorization is not currently usable.' };
    }
  }

  if (policy.decision !== 'ALLOW' && policy.decision !== 'APPROVAL_REQUIRED') {
    return { allowed: false, reason: 'No executable policy decision exists.' };
  }

  return {
    allowed: true,
    reason: 'Action passed the policy and execution authorization boundary.',
    receipt: {
      actionId,
      companyId: input.companyId,
      action: input.action,
      parametersHash: input.parametersHash,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      authorizedAt: new Date(now).toISOString(),
      gateVersion: ACTION_GATE_VERSION,
    },
  };
}

export const ACTION_GATE_RULES = [
  'TASK_COMPLETION_DOES_NOT_AUTHORIZE_SIDE_EFFECTS',
  'EVERY_ACTION_MUST_PASS_POLICY_ENGINE',
  'APPROVAL_IS_BOUND_TO_EXACT_ACTION_AND_PARAMETERS',
  'IDEMPOTENCY_KEY_IS_REQUIRED_FOR_SIDE_EFFECTS',
  'CORRELATION_ID_IS_REQUIRED_FOR_TRACEABILITY',
  'CLIENT_STATE_MUST_NEVER_AUTHORIZE_EXECUTION',
  'REVIEW_REQUIRED_CANNOT_EXECUTE',
  'BLOCK_CANNOT_BE_OVERRIDDEN',
  'CRITICAL_APPROVAL_MUST_MATCH_EXACT_PARAMETERS',
  'EXECUTION_RECEIPTS_ARE_AUDITABLE',
] as const;
