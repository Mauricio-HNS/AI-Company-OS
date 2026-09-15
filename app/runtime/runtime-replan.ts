import type { Plan } from '../core/domain-model';
import type { LearningSignal } from './runtime-learning';
import type { RuntimeContextState } from './runtime-context';

export interface ReplanDecision {
  required: boolean;
  reason: 'OUTCOME_FAILED' | 'LESSONS_AVAILABLE' | 'NO_REPLAN_REQUIRED';
  sourceOutcomeId: string;
}

export function evaluateReplan(signal: LearningSignal): ReplanDecision {
  if (!signal.success) {
    return { required: true, reason: 'OUTCOME_FAILED', sourceOutcomeId: signal.outcomeId };
  }

  if (signal.recommendedReplan) {
    return { required: true, reason: 'LESSONS_AVAILABLE', sourceOutcomeId: signal.outcomeId };
  }

  return { required: false, reason: 'NO_REPLAN_REQUIRED', sourceOutcomeId: signal.outcomeId };
}

export function attachReplanToRuntime(
  state: RuntimeContextState,
  plan: Plan,
): RuntimeContextState {
  return {
    ...state,
    phase: 'REPLAN',
    plan,
    updatedAt: new Date().toISOString(),
  };
}

export const RUNTIME_REPLAN_RULES = {
  REPLAN_IS_OUTCOME_DRIVEN: 'Replanning is triggered by observed results and validated learning signals.',
  REPLAN_REQUIRES_REEVALUATION: 'A revised plan must pass plan evaluation again before policy evaluation.',
  REPLAN_DOES_NOT_INHERIT_AUTHORITY: 'A revised plan does not inherit execution authority from the previous plan or action.',
} as const;
