import type { Outcome } from '../core/domain-model';
import type { RuntimeContextState } from './runtime-context';

export function attachOutcomeToRuntime(
  state: RuntimeContextState,
  outcome: Outcome,
): RuntimeContextState {
  return {
    ...state,
    phase: 'OUTCOME',
    outcome,
    updatedAt: outcome.observedAt,
  };
}

export function calculateOutcomeVariance(
  expected: Record<string, number> | undefined,
  observed: Record<string, number>,
): Record<string, number> {
  if (!expected) return {};

  return Object.fromEntries(
    Object.entries(expected).map(([metric, expectedValue]) => [
      metric,
      observed[metric] === undefined ? 0 : observed[metric] - expectedValue,
    ]),
  );
}

export const RUNTIME_OUTCOME_RULES = {
  OUTCOME_REQUIRES_ACTION: 'Every outcome must reference the action that produced the observed result.',
  OBSERVATION_IS_SEPARATE_FROM_STATUS: 'Execution status alone is not an outcome; observed business metrics are required.',
  VARIANCE_FEEDS_LEARNING: 'Expected-versus-observed variance becomes input for evaluation and learning.',
} as const;
