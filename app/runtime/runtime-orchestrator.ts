import type {
  Action,
  Outcome,
  Plan,
  Request,
  Decision,
} from '../core/domain-model';
import type { PlanEvaluation } from '../planning/plan-evaluation';
import type { OpportunityEvaluationResult } from '../planning/opportunity-evaluation';
import type { PolicyRule, PolicyDecision } from '../security/policy-engine';
import type { OwnerAuthorizationRequest } from '../security/owner-authorization';
import { canExecuteAction, evaluateActionGate, type ExecutionReceipt } from './action-gate';
import { ExecutionLedger } from './execution-ledger';
import { attachRequestToRuntime } from './runtime-request';
import { attachDecisionToRuntime } from './runtime-decision';
import { attachPlanToRuntime } from './runtime-plan';
import { attachPlanEvaluationToRuntime } from './runtime-plan-evaluation';
import { attachOpportunityEvaluationToRuntime } from './runtime-opportunity';
import { attachActionToRuntime } from './runtime-action';
import { attachOutcomeToRuntime } from './runtime-outcome';
import { attachLearningToRuntime, deriveLearningSignal, type LearningSignal } from './runtime-learning';
import { attachReplanToRuntime, evaluateReplan, type ReplanDecision } from './runtime-replan';
import { canEnterAction, transitionState } from './runtime-transitions';
import type { RuntimeContextState } from './runtime-context';
import { EMPTY_RUNTIME_CONTEXT } from './runtime-context';

export const RUNTIME_ORCHESTRATOR_VERSION = '1.0';

export type RuntimeStopReason =
  | 'REVIEW_REQUIRED'
  | 'APPROVAL_REQUIRED'
  | 'BLOCK'
  | 'EXECUTION_DENIED'
  | 'EXECUTION_FAILED';

export interface RuntimeExecutionResult {
  allowed: boolean;
  reason: string;
  receipt?: ExecutionReceipt;
}

export interface RuntimeExecutionAdapterResult {
  success: boolean;
  metrics: Record<string, number>;
  expected?: Record<string, number>;
  lessons?: string[];
}

export type RuntimeExecutionAdapter = (
  action: Action,
  receipt: ExecutionReceipt,
) => Promise<RuntimeExecutionAdapterResult>;

export interface RuntimeOrchestratorSnapshot {
  state: RuntimeContextState;
  lastPolicyDecision?: PolicyDecision;
  lastLearningSignal?: LearningSignal;
  replanDecision?: ReplanDecision;
  stopped: boolean;
  stopReason?: RuntimeStopReason;
}

/** Coordinates runtime transitions without becoming an authorization authority. */
export class RuntimeOrchestrator {
  private snapshot: RuntimeOrchestratorSnapshot = { state: EMPTY_RUNTIME_CONTEXT, stopped: false };
  private readonly executionLedger: ExecutionLedger;

  constructor(executionLedger = new ExecutionLedger()) {
    this.executionLedger = executionLedger;
  }

  getSnapshot(): RuntimeOrchestratorSnapshot {
    return this.snapshot;
  }

  acceptRequest(request: Request): RuntimeOrchestratorSnapshot {
    if (this.snapshot.state.phase !== 'REQUEST') throw new Error('Runtime request can only be accepted at REQUEST phase.');
    this.snapshot = { ...this.snapshot, state: attachRequestToRuntime(this.snapshot.state, request) };
    return this.snapshot;
  }

  acceptDecision(decision: Decision): RuntimeOrchestratorSnapshot {
    const state = transitionState(this.snapshot.state, 'DECISION');
    this.snapshot = { ...this.snapshot, state: attachDecisionToRuntime(state, decision) };
    return this.snapshot;
  }

  acceptPlan(plan: Plan): RuntimeOrchestratorSnapshot {
    const state = transitionState(this.snapshot.state, 'PLAN');
    this.snapshot = { ...this.snapshot, state: attachPlanToRuntime(state, plan) };
    return this.snapshot;
  }

  recordPlanEvaluation(evaluation: PlanEvaluation): RuntimeOrchestratorSnapshot {
    if (this.snapshot.state.plan?.id !== evaluation.planId) throw new Error('Plan evaluation must reference the current runtime plan.');
    const state = transitionState(this.snapshot.state, 'PLAN_EVALUATION');
    this.snapshot = { ...this.snapshot, state: attachPlanEvaluationToRuntime(state, evaluation) };
    return this.snapshot;
  }

  recordOpportunityEvaluation(evaluation: OpportunityEvaluationResult): RuntimeOrchestratorSnapshot {
    const state = transitionState(this.snapshot.state, 'OPPORTUNITY_ANALYSIS');
    this.snapshot = { ...this.snapshot, state: attachOpportunityEvaluationToRuntime(state, evaluation) };
    return this.snapshot;
  }

  recordPolicyDecision(policyDecision: PolicyDecision): RuntimeOrchestratorSnapshot {
    const state = transitionState(this.snapshot.state, 'POLICY_CHECK');
    const next = { ...state, policyDecision, updatedAt: new Date().toISOString() };

    if (policyDecision === 'BLOCK') {
      this.snapshot = { ...this.snapshot, state: next, stopped: true, stopReason: 'BLOCK', lastPolicyDecision: policyDecision };
      return this.snapshot;
    }
    if (policyDecision === 'REVIEW_REQUIRED') {
      this.snapshot = { ...this.snapshot, state: next, stopped: true, stopReason: 'REVIEW_REQUIRED', lastPolicyDecision: policyDecision };
      return this.snapshot;
    }
    if (policyDecision === 'APPROVAL_REQUIRED') {
      this.snapshot = { ...this.snapshot, state: next, stopped: true, stopReason: 'APPROVAL_REQUIRED', lastPolicyDecision: policyDecision };
      return this.snapshot;
    }

    this.snapshot = { ...this.snapshot, state: next, stopped: false, stopReason: undefined, lastPolicyDecision: policyDecision };
    return this.snapshot;
  }

  prepareAction(
    action: Action,
    rules: PolicyRule[],
    ownerAuthorization?: OwnerAuthorizationRequest,
    now = Date.now(),
  ): RuntimeExecutionResult {
    if (this.snapshot.stopped && this.snapshot.stopReason !== 'APPROVAL_REQUIRED') return { allowed: false, reason: `Runtime is stopped: ${this.snapshot.stopReason}.` };

    const policyDecision = this.snapshot.state.policyDecision;
    if (!policyDecision || !canEnterAction(policyDecision)) return { allowed: false, reason: 'Action cannot enter execution without ALLOW or APPROVAL_REQUIRED.' };

    const input = {
      companyId: action.context.companyId,
      agentId: action.actorId,
      action: action.action,
      authorityLevel: action.authorityLevel,
      risk: action.risk,
      context: { environmentId: action.context.environmentId, domainId: action.context.domainId, taskId: action.taskId },
      taskId: action.taskId,
      parametersHash: action.parametersHash,
      idempotencyKey: action.idempotencyKey,
      correlationId: action.correlationId,
      ownerAuthorization,
    };

    const gate = evaluateActionGate(input, rules, now);
    if (gate.decision !== policyDecision) return { allowed: false, reason: `Policy changed between runtime decision and action gate: ${policyDecision} -> ${gate.decision}.` };

    const result = canExecuteAction(input, gate, action.id, now);
    if (!result.allowed || !result.receipt) return { allowed: false, reason: result.reason };

    const reservation = this.executionLedger.reserve(result.receipt, now);
    if (!reservation.accepted) return { allowed: false, reason: reservation.reason };

    const state = transitionState(this.snapshot.state, 'ACTION');
    this.snapshot = {
      ...this.snapshot,
      stopped: false,
      stopReason: undefined,
      state: attachActionToRuntime({ ...state, policyDecision: gate.decision }, action, result.receipt),
    };
    return result;
  }

  async executeAuthorizedAction(adapter: RuntimeExecutionAdapter): Promise<RuntimeOrchestratorSnapshot> {
    const { action, executionReceipt } = this.snapshot.state;
    if (!action || !executionReceipt) throw new Error('No authorized action is ready for execution.');

    this.executionLedger.markStarted(executionReceipt);

    try {
      const observed = await adapter(action, executionReceipt);
      if (observed.success) this.executionLedger.markSucceeded(executionReceipt);
      else this.executionLedger.markFailed(executionReceipt);

      const outcome: Outcome = {
        id: `OUT-${action.id}-${Date.now()}`,
        context: action.context,
        actionId: action.id,
        success: observed.success,
        metrics: observed.metrics,
        expected: observed.expected,
        observedAt: new Date().toISOString(),
        lessons: observed.lessons,
      };

      const state = transitionState(this.snapshot.state, 'OUTCOME');
      this.snapshot = {
        ...this.snapshot,
        state: attachOutcomeToRuntime(state, outcome),
        stopped: false,
        stopReason: observed.success ? undefined : 'EXECUTION_FAILED',
      };
    } catch (error) {
      this.executionLedger.markFailed(executionReceipt);
      this.snapshot = { ...this.snapshot, stopped: true, stopReason: 'EXECUTION_FAILED' };
      throw error;
    }
    return this.snapshot;
  }

  learn(): RuntimeOrchestratorSnapshot {
    const outcome = this.snapshot.state.outcome;
    if (!outcome) throw new Error('Learning requires an observed outcome.');
    const signal = deriveLearningSignal(outcome);
    const state = transitionState(this.snapshot.state, 'LEARNING');
    this.snapshot = { ...this.snapshot, state: attachLearningToRuntime(state, outcome), lastLearningSignal: signal };
    return this.snapshot;
  }

  replan(plan: Plan): RuntimeOrchestratorSnapshot {
    const signal = this.snapshot.lastLearningSignal;
    if (!signal) throw new Error('Replan requires a learning signal.');
    const decision = evaluateReplan(signal);
    this.snapshot = { ...this.snapshot, replanDecision: decision };
    if (!decision.required) return this.snapshot;

    const state = transitionState(this.snapshot.state, 'REPLAN');
    this.snapshot = {
      ...this.snapshot,
      state: attachReplanToRuntime(state, plan),
      stopped: false,
      stopReason: undefined,
      lastPolicyDecision: undefined,
    };
    return this.snapshot;
  }
}

export const RUNTIME_ORCHESTRATOR_RULES = {
  ORCHESTRATOR_IS_NOT_AUTHORITY: 'The orchestrator coordinates domain transitions but never grants authority.',
  POLICY_IS_RECHECKED_AT_ACTION_BOUNDARY: 'The action gate must re-evaluate policy immediately before execution.',
  POLICY_DRIFT_STOPS_EXECUTION: 'A policy result different from the runtime decision stops the action.',
  BLOCK_IS_TERMINAL: 'BLOCK cannot continue into action execution.',
  REVIEW_REQUIRES_PROPOSAL_PATH: 'REVIEW_REQUIRED stops execution and requires proposal handling outside execution.',
  APPROVAL_REQUIRES_EXPLICIT_OWNER_AUTHORIZATION: 'APPROVAL_REQUIRED cannot execute without exact usable owner authorization.',
  OUTCOME_REQUIRES_RECEIPT: 'Observed outcomes require an execution receipt tied to the exact action.',
  REPLAY_IS_DENIED: 'An idempotency key cannot be reserved twice in the same company execution scope.',
  LEARNING_CANNOT_GRANT_AUTHORITY: 'Learning may recommend replanning but cannot change policy or authority.',
  REPLAN_RESTARTS_GOVERNANCE: 'A replanned operation must pass evaluation and policy again.',
  EXECUTION_ADAPTER_IS_EXTERNAL: 'Real side effects are delegated to an explicit adapter and are not simulated by the orchestrator.',
} as const;
