import type { Plan } from '../core/domain-model';
import type { RuntimeContextState } from './runtime-context';

export function attachPlanToRuntime(
  state: RuntimeContextState,
  plan: Plan,
): RuntimeContextState {
  return {
    ...state,
    phase: 'PLAN',
    plan,
    updatedAt: plan.createdAt,
  };
}

export const RUNTIME_PLAN_RULES = {
  PLAN_FOLLOWS_DECISION: 'A runtime plan follows a decision and does not grant execution authority.',
  PLAN_REQUIRES_POLICY_LATER: 'A plan must still pass evaluation and policy checks before any action can execute.',
} as const;
