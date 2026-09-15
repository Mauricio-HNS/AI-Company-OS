import type { PolicyDecision } from '../security/policy-engine';
import type { RuntimeContextState } from './runtime-context';

export function attachPolicyDecisionToRuntime(
  state: RuntimeContextState,
  policyDecision: PolicyDecision,
): RuntimeContextState {
  return {
    ...state,
    phase: 'POLICY_CHECK',
    policyDecision,
    updatedAt: new Date().toISOString(),
  };
}

export const RUNTIME_POLICY_RULES = {
  POLICY_PRECEDES_ACTION:
    'Policy evaluation must be recorded before an action can enter execution.',
  POLICY_IS_NOT_EXECUTION:
    'A policy decision describes authorization state but does not execute an action.',
  ALLOW_STILL_REQUIRES_GATE:
    'An allowed action must still pass the action gate and execution safeguards.',
  REVIEW_CREATES_PROPOSAL_PATH:
    'A review-required decision must be analyzed and may create a proposal.',
  APPROVAL_REQUIRES_OWNER:
    'An approval-required decision requires explicit owner authorization.',
  BLOCK_STOPS_EXECUTION:
    'A blocked policy decision cannot enter execution.',
} as const;
