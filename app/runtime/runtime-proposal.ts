import type { Action, Proposal } from '../core/domain-model';
import type { PolicyDecisionResult } from '../security/policy-engine';

export const RUNTIME_PROPOSAL_VERSION = '1.0';

export interface RuntimeProposalInput {
  action: Action;
  policy: PolicyDecisionResult;
  reason?: string;
  expectedBenefit?: string;
  now?: number;
}

/**
 * Converts a non-executable policy result into a review artifact.
 * A proposal is never an authorization and cannot be used as an execution receipt.
 */
export function createRuntimeProposal(input: RuntimeProposalInput): Proposal {
  const { action, policy } = input;

  if (policy.decision === 'BLOCK') {
    throw new Error('BLOCK actions cannot create proposals that could bypass the policy boundary.');
  }

  if (!policy.canCreateProposal) {
    throw new Error(`Policy decision ${policy.decision} does not permit proposal creation.`);
  }

  const now = input.now ?? Date.now();
  const recommendation = policy.decision === 'APPROVAL_REQUIRED' ? 'OWNER_REVIEW' : 'PROPOSE';

  return {
    id: `PROP-${action.id}-${now}`,
    context: action.context,
    sourceActionId: action.id,
    title: `Review action ${action.action}`,
    reason: input.reason ?? policy.reason,
    recommendation,
    risk: action.risk,
    expectedBenefit: input.expectedBenefit,
    createdAt: new Date(now).toISOString(),
  };
}

export const RUNTIME_PROPOSAL_RULES = {
  BLOCK_CANNOT_CREATE_BYPASS_PROPOSAL: 'A hard-blocked action cannot be converted into a proposal that could bypass the block.',
  REVIEW_CREATES_REVIEW_ARTIFACT: 'REVIEW_REQUIRED may produce a proposal for Central de Comando but remains non-executable.',
  APPROVAL_CREATES_OWNER_REVIEW: 'APPROVAL_REQUIRED may produce an owner-review artifact but still requires exact owner authorization.',
  PROPOSALS_ARE_NOT_AUTHORIZATIONS: 'A proposal never grants execution authority and cannot create an execution receipt.',
  PROPOSAL_IS_BOUND_TO_ACTION: 'The proposal references the exact action under review so it cannot authorize a different action.',
} as const;
