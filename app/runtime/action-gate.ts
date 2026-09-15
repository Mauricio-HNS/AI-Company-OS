/**
 * AI Company OS — Action Gate
 *
 * Tasks describe work. Actions create side effects. Only actions cross the
 * authorization boundary.
 */

import { evaluatePolicy, type PolicyCheckInput, type PolicyDecisionResult, type PolicyRule } from '../security/policy-engine';

export interface ActionGateInput extends PolicyCheckInput {
  taskId: string;
  parametersHash: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface ActionGateResult extends PolicyDecisionResult {
  taskId: string;
  parametersHash: string;
  idempotencyKey: string;
  correlationId: string;
}

export function evaluateActionGate(input: ActionGateInput, rules: PolicyRule[], now = Date.now()): ActionGateResult {
  const policy = evaluatePolicy(input, rules, now);

  return {
    ...policy,
    taskId: input.taskId,
    parametersHash: input.parametersHash,
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
  };
}

export const ACTION_GATE_RULES = [
  'TASK_COMPLETION_DOES_NOT_AUTHORIZE_SIDE_EFFECTS',
  'EVERY_ACTION_MUST_PASS_POLICY_ENGINE',
  'APPROVAL_IS_BOUND_TO_EXACT_ACTION_AND_PARAMETERS',
  'IDEMPOTENCY_KEY_IS_REQUIRED_FOR_SIDE_EFFECTS',
  'CORRELATION_ID_IS_REQUIRED_FOR_TRACEABILITY',
  'CLIENT_STATE_MUST_NEVER_AUTHORIZE_EXECUTION',
] as const;
