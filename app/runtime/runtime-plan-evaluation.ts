import type { PlanEvaluation } from '../planning/plan-evaluation';
import type { RuntimeContextState } from './runtime-context';

export function attachPlanEvaluationToRuntime(
  state: RuntimeContextState,
  evaluation: PlanEvaluation,
): RuntimeContextState {
  return {
    ...state,
    phase: 'PLAN_EVALUATION',
    planEvaluation: evaluation,
    updatedAt: new Date().toISOString(),
  };
}

export const RUNTIME_PLAN_EVALUATION_RULES = {
  EVALUATION_IS_ADVISORY: 'Plan evaluation informs the next decision but never grants execution authority.',
  POLICY_REMAINS_AUTHORITATIVE: 'Policy evaluation remains the execution authority boundary after plan evaluation.',
} as const;
