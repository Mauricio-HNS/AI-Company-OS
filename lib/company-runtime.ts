import type { AgentProfile, CompanyObjective, OperatingPlan } from './operating-engine'
import { advanceTask, evaluatePlan } from './operating-engine'
import { generateMission, missionToOperatingPlan, type Mission } from './mission-generator'
import { completeTask, createExecutionQueue, getReadyItems, startTask, type ExecutionQueue } from './execution-queue'
import { evaluatePlan as evaluateResults, type LearningRecord } from './evaluation-engine'
import { createReplanDecision, replanTasks, type ReplanDecision } from './replanning-engine'
import { monitorSafety, type SafetyDecision, type SafetyRule } from './safety-monitor'
import { reserveBudget, type BudgetReservation } from './budget-engine'
import { grantAutonomy, recordAutonomyExecution, type CapabilityAutonomy } from './autonomy-engine'
import { createMemory, type CompanyMemory } from './company-memory'
import { ingestBridgeEnvelope, type BridgeIngestionEnvelope } from './company-brain-ingestion'
import { registerBrainDecision, approveBrainDecision, rejectBrainDecision, decisionToTask, type RuntimeBrainDecision } from './brain-decision'

export type RuntimeState = {
  objective: CompanyObjective
  mission: Mission
  plan: OperatingPlan
  queue: ExecutionQueue
  learning?: LearningRecord
  replan?: ReplanDecision
  safety: SafetyDecision
  budgetReservations: BudgetReservation[]
  autonomy: CapabilityAutonomy[]
  memory: CompanyMemory[]
  brainDecisions: RuntimeBrainDecision[]
}

const defaultSafetyRules: SafetyRule[] = [
  { id: 'margin-floor', name: 'Margin below safety floor', level: 'ABORT_EXPERIMENT', predicate: metrics => metrics.margin < 0.1 },
  { id: 'anomaly', name: 'Critical operational anomaly', level: 'EMERGENCY_STOP', predicate: metrics => metrics.anomaly >= 1 },
]

export function initializeRuntime(objective: CompanyObjective, agents: AgentProfile[], options: { deadline?: string; budget?: number; constraints?: string[] } = {}): RuntimeState {
  const mission = generateMission({ objective, ...options }, agents)
  const plan = missionToOperatingPlan(mission, 1)
  return {
    objective, mission, plan, queue: createExecutionQueue(plan),
    safety: monitorSafety({ margin: 1, anomaly: 0 }, defaultSafetyRules),
    budgetReservations: options.budget ? [reserveBudget(`${objective.id}:cycle-1`, options.budget)] : [],
    autonomy: ['research', 'analytics', 'experimentation', 'product', 'finance'].map(capability => grantAutonomy(capability, capability === 'finance' ? 'LOW' : 'MEDIUM')),
    brainDecisions: [],
    memory: [createMemory({ statement: `Objective initialized: ${objective.title}`, context: objective.description, source: 'runtime', observedAt: new Date().toISOString(), confidence: 1, evidence: [], supportingExperiments: [] })],
  }
}

export function ingestCompanyBridge(state: RuntimeState, envelope: BridgeIngestionEnvelope): RuntimeState {
  const result = ingestBridgeEnvelope(envelope)
  if (!result.accepted || result.memories.length === 0) return state

  return {
    ...state,
    memory: [...state.memory, ...result.memories],
  }
}

export function registerRuntimeBrainDecision(
  state: RuntimeState,
  decision: RuntimeBrainDecision,
): RuntimeState {
  const normalized = registerBrainDecision(decision, state.objective.id)
  if (!normalized) return state
  const existing = state.brainDecisions.some(item => item.decisionId === normalized.decisionId)
  if (existing) return state
  return { ...state, brainDecisions: [...state.brainDecisions, normalized] }
}

export function approveRuntimeBrainDecision(
  state: RuntimeState,
  decisionId: string,
  preconditionsSatisfied = true,
): RuntimeState {
  const decision = state.brainDecisions.find(item => item.decisionId === decisionId)
  if (!decision) return state
  const approved = approveBrainDecision(decision, preconditionsSatisfied)
  if (approved.status !== 'APPROVED') return state
  return {
    ...state,
    brainDecisions: state.brainDecisions.map(item => item.decisionId === decisionId ? approved : item),
  }
}

export function rejectRuntimeBrainDecision(state: RuntimeState, decisionId: string): RuntimeState {
  const decision = state.brainDecisions.find(item => item.decisionId === decisionId)
  if (!decision) return state
  return {
    ...state,
    brainDecisions: state.brainDecisions.map(item => item.decisionId === decisionId ? rejectBrainDecision(item) : item),
  }
}

export function enqueueApprovedBrainDecision(state: RuntimeState, decisionId: string): RuntimeState {
  const decision = state.brainDecisions.find(item => item.decisionId === decisionId)
  if (!decision) return state
  const task = decisionToTask(decision)
  if (!task || state.plan.tasks.some(item => item.id === task.id)) return state
  return {
    ...state,
    plan: { ...state.plan, tasks: [...state.plan.tasks, task] },
    queue: createExecutionQueue({ ...state.plan, tasks: [...state.plan.tasks, task] }),
  }
}

export function startNextReadyTask(state: RuntimeState): RuntimeState {
  if (state.safety.level === 'ABORT_TASK' || state.safety.level === 'ABORT_EXPERIMENT' || state.safety.level === 'EMERGENCY_STOP') return state
  const ready = getReadyItems(state.queue, state.plan)[0]
  if (!ready) return state
  return { ...state, queue: startTask(state.queue, ready.taskId), plan: { ...state.plan, tasks: state.plan.tasks.map(task => task.id === ready.taskId ? { ...task, status: 'EXECUTING' as const } : task) } }
}

export function recordTaskResult(state: RuntimeState, taskId: string, success: boolean, actual: string, score: number, metrics: Record<string, number> = { margin: 1, anomaly: 0 }): RuntimeState {
  const safety = monitorSafety(metrics, defaultSafetyRules)
  if (safety.level === 'ABORT_TASK' || safety.level === 'ABORT_EXPERIMENT' || safety.level === 'EMERGENCY_STOP') return { ...state, safety }
  const capability = state.plan.tasks.find(task => task.id === taskId)?.requiredCapabilities[0]
  const queue = completeTask(state.queue, taskId, success, success ? undefined : actual)
  const plan = advanceTask(state.plan, taskId, success ? 'success' : 'failure')
  const learning = evaluateResults(plan, { [taskId]: { actual, score } })
  const evaluation = evaluatePlan(plan)
  return {
    ...state, queue, plan, learning, safety,
    replan: evaluation.recommendation === 'REPLAN_FAILED_TASKS' || evaluation.recommendation === 'LEARN_AND_REPLAN' ? createReplanDecision(plan, learning) : undefined,
    autonomy: state.autonomy.map(item => item.capability === capability ? recordAutonomyExecution(item, success) : item),
  }
}

export function applyReplan(state: RuntimeState, agents: AgentProfile[]): RuntimeState {
  if (!state.replan || state.replan.requiresHumanReview) return state
  const plan = replanTasks(state.plan, agents, state.replan)
  return {
    ...state, plan,
    mission: { ...state.mission, tasks: plan.tasks, status: plan.tasks.some(task => task.status === 'BLOCKED') ? 'BLOCKED' : 'READY' },
    queue: createExecutionQueue(plan), replan: undefined,
    safety: monitorSafety({ margin: 1, anomaly: 0 }, defaultSafetyRules),
    memory: [...state.memory, createMemory({ statement: `Cycle ${plan.cycle} replanned`, context: state.objective.title, source: 'replanning-engine', observedAt: new Date().toISOString(), confidence: 1, evidence: state.learning?.evaluations.map(item => item.lesson ?? item.diagnosis) ?? [], supportingExperiments: [] })],
  }
}
