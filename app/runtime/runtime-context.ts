import type { Decision, Plan, Proposal, Request, Action, Outcome } from '../core/domain-model';
import type { PolicyDecision } from '../security/policy-engine';
import type { PlanEvaluation } from '../planning/plan-evaluation';
import type { OpportunityEvaluationResult } from '../planning/opportunity-evaluation';
import type { ExecutionReceipt } from './action-gate';

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
  planEvaluation?: PlanEvaluation;
  opportunityEvaluation?: OpportunityEvaluationResult;
  policyDecision?: PolicyDecision;
  proposal?: Proposal;
  action?: Action;
  executionReceipt?: ExecutionReceipt;
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
  PLAN_EVALUATION_PRECEDES_POLICY: 'Plan evaluation records feasibility, risk and recommendation before policy evaluation.',
  OPPORTUNITY_ANALYSIS_PRECEDES_POLICY: 'Unauthorized actions are analyzed before policy execution decisions when appropriate.',
  POLICY_PRECEDES_ACTION: 'No action may enter execution before policy evaluation.',
  EXECUTION_RECEIPT_PROVES_GATE: 'An execution receipt records that the action crossed the domain execution boundary.',
  OUTCOME_FOLLOWS_ACTION: 'Execution is evaluated through an explicit outcome.',
  LEARNING_FOLLOWS_OUTCOME: 'Learning uses observed outcomes rather than execution status alone.',
  CONTEXT_IS_PROJECTION: 'This state is an operational projection, not an authorization boundary.',
  SERVER_IS_AUTHORITY: 'Production authorization must be enforced by a trusted server, never by this client projection.',
} as const;
