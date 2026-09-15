import type { Decision } from '../core/domain-model';
import type { RuntimeContextState } from './runtime-context';

export function attachDecisionToRuntime(
  state: RuntimeContextState,
  decision: Decision,
): RuntimeContextState {
  return {
    ...state,
    phase: 'DECISION',
    decision,
    updatedAt: decision.createdAt,
  };
}

export const RUNTIME_DECISION_RULES = {
  DECISION_REQUIRES_CONTEXT: 'A decision must retain the request or mission context that produced it.',
  DECISION_IS_NOT_AUTHORITY: 'A runtime decision records reasoning and intent but never grants execution authority.',
} as const;
