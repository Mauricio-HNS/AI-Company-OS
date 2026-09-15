import type { RuntimeContextState, RuntimePhase } from './runtime-context';
import type { PolicyDecision } from '../security/policy-engine';

export type RuntimeTransitionDecision =
  | { allowed: true; from: RuntimePhase; to: RuntimePhase }
  | { allowed: false; from: RuntimePhase; to: RuntimePhase; reason: string };

const NEXT_PHASES: Record<RuntimePhase, RuntimePhase[]> = {
  REQUEST: ['DECISION'],
  DECISION: ['PLAN'],
  PLAN: ['PLAN_EVALUATION'],
  PLAN_EVALUATION: ['OPPORTUNITY_ANALYSIS'],
  OPPORTUNITY_ANALYSIS: ['POLICY_CHECK'],
  POLICY_CHECK: ['ACTION'],
  ACTION: ['OUTCOME'],
  OUTCOME: ['LEARNING'],
  LEARNING: ['REPLAN'],
  REPLAN: ['PLAN'],
};

export function canTransition(state: RuntimeContextState, to: RuntimePhase): RuntimeTransitionDecision {
  const from = state.phase;

  if (!NEXT_PHASES[from].includes(to)) {
    return { allowed: false, from, to, reason: `Invalid runtime transition ${from} -> ${to}.` };
  }

  if (to === 'DECISION' && !state.request) return { allowed: false, from, to, reason: 'Decision requires a request context.' };
  if (to === 'PLAN' && !state.decision) return { allowed: false, from, to, reason: 'Plan requires a decision context.' };
  if (to === 'PLAN_EVALUATION' && !state.plan) return { allowed: false, from, to, reason: 'Plan evaluation requires a plan.' };
  if (to === 'OPPORTUNITY_ANALYSIS' && !state.planEvaluation) return { allowed: false, from, to, reason: 'Opportunity analysis requires plan evaluation.' };
  if (to === 'POLICY_CHECK' && !state.opportunityEvaluation) return { allowed: false, from, to, reason: 'Policy check requires opportunity analysis.' };

  if (to === 'ACTION') {
    if (!state.policyDecision) return { allowed: false, from, to, reason: 'Action requires a recorded policy decision.' };
    if (!canEnterAction(state.policyDecision)) {
      return { allowed: false, from, to, reason: `Policy decision ${state.policyDecision} cannot enter the execution path.` };
    }
  }

  if (to === 'OUTCOME' && !state.action) return { allowed: false, from, to, reason: 'Outcome requires an action.' };
  if (to === 'LEARNING' && !state.outcome) return { allowed: false, from, to, reason: 'Learning requires an observed outcome.' };
  if (to === 'REPLAN' && !state.outcome) return { allowed: false, from, to, reason: 'Replan requires an observed outcome.' };

  return { allowed: true, from, to };
}

export function canEnterAction(policyDecision: PolicyDecision): boolean {
  return policyDecision === 'ALLOW' || policyDecision === 'APPROVAL_REQUIRED';
}

export function isTerminalPolicyDecision(policyDecision: PolicyDecision): boolean {
  return policyDecision === 'BLOCK' || policyDecision === 'REVIEW_REQUIRED';
}

export function transitionState(state: RuntimeContextState, to: RuntimePhase): RuntimeContextState {
  const decision = canTransition(state, to);
  if (!decision.allowed) throw new Error(decision.reason);
  return { ...state, phase: to, updatedAt: new Date().toISOString() };
}

export const RUNTIME_TRANSITION_RULES = {
  SEQUENTIAL_BY_DEFAULT: 'Runtime phases move through explicit guarded transitions.',
  NO_ACTION_WITHOUT_POLICY: 'ACTION requires a policy decision already present in runtime context.',
  REVIEW_STOPS_EXECUTION: 'REVIEW_REQUIRED does not enter execution and must use a proposal path.',
  BLOCK_STOPS_EXECUTION: 'BLOCK is terminal for the current execution attempt.',
  APPROVAL_IS_NOT_AUTOMATIC: 'APPROVAL_REQUIRED permits the approval path but never supplies owner approval itself.',
  OUTCOME_REQUIRES_ACTION: 'OUTCOME cannot precede ACTION.',
  LEARNING_REQUIRES_OUTCOME: 'LEARNING cannot precede an observed OUTCOME.',
  REPLAN_RESTARTS_EVALUATION: 'REPLAN returns to PLAN and therefore forces plan evaluation and policy reevaluation.',
} as const;
