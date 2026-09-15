import type { OpportunityEvaluationResult } from '../planning/opportunity-evaluation';
import type { RuntimeContextState } from './runtime-context';

export function attachOpportunityEvaluationToRuntime(
  state: RuntimeContextState,
  evaluation: OpportunityEvaluationResult,
): RuntimeContextState {
  return {
    ...state,
    phase: 'OPPORTUNITY_ANALYSIS',
    opportunityEvaluation: evaluation,
    updatedAt: new Date().toISOString(),
  };
}

export const RUNTIME_OPPORTUNITY_RULES = {
  ANALYSIS_PRECEDES_POLICY: 'Opportunity analysis must occur before the final policy check.',
  REVIEW_NEVER_EXECUTES: 'An opportunity recommendation never authorizes execution.',
  HARD_BLOCK_REMAINS_FINAL: 'A hard block cannot be overridden by an opportunity proposal.',
} as const;
