import type { Decision, Plan, Proposal, Request, Action, Outcome } from '../core/domain-model';
import type { PolicyDecision } from '../security/policy-engine';

export type RuntimePhase =
  | 'REQUEST'
  | 'DECISION'
  | 'PLAN'
  | 'PLAN_EVALUATION'
  | 'OPPORTUNITY_ANALYSIS'
  | 'POLICY_CHECK'
  | 'ACTION'
  | 'OUTCOME'
  | 'LEARNING'
  | 'REPLAN';

export type RuntimeContextState = {
  phase: RuntimePhase;
  request?: Request;
  decision?: Decision;
  plan?: Plan;
  policyDecision?: PolicyDecision;
  proposal?: Proposal;
  action?: Action;
  outcome?: Outcome;
  updatedAt?: string;
};

export const EMPTY_RUNTIME_CONTEXT: RuntimeContextState = {
  phase: 'REQUEST',
};

export const RUNTIME_PHASE_ORDER: RuntimePhase[] = [
  'REQUEST',
  'DECISION',
  'PLAN',
  'PLAN_EVALUATION',
  'OPPORTUNITY_ANALYSIS',
  'POLICY_CHECK',
  'ACTION',
  'OUTCOME',
  'LEARNING',
  'REPLAN',
];

export const RUNTIME_CONTEXT_RULES = {
  REQUEST_PRECEDES_DECISION: 'A runtime decision must have a request or mission context.',
  PLAN_PRECEDES_ACTION: 'Actions are created from an evaluated plan and task context.',
  POLICY_PRECEDES_ACTION: 'No action may enter execution before policy evaluation.',
  OUTCOME_FOLLOWS_ACTION: 'Execution is evaluated through an explicit outcome.',
  LEARNING_FOLLOWS_OUTCOME: 'Learning uses observed outcomes rather than execution status alone.',
  CONTEXT_IS_PROJECTION: 'This state is an operational projection, not an authorization boundary.',
} as const;
