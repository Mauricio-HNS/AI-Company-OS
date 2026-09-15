import type { AgentProfile, CompanyObjective, OperatingPlan } from './operating-engine'
import { advanceTask, evaluatePlan } from './operating-engine'
import { generateMission, missionToOperatingPlan, type Mission } from './mission-generator'
import { completeTask, createExecutionQueue, getReadyItems, startTask, type ExecutionQueue } from './execution-queue'
import { evaluatePlan as evaluateResults, type LearningRecord } from './evaluation-engine'
import { createReplanDecision, replanTasks, type ReplanDecision } from './replanning-engine'

export type RuntimeState = {
  objective: CompanyObjective
  mission: Mission
  plan: OperatingPlan
  queue: ExecutionQueue
  learning?: LearningRecord
  replan?: ReplanDecision
}

export function initializeRuntime(
  objective: CompanyObjective,
  agents: AgentProfile[],
  options: { deadline?: string; budget?: number; constraints?: string[] } = {},
): RuntimeState {
  const mission = generateMission({ objective, ...options }, agents)
  const plan = missionToOperatingPlan(mission, 1)
  return { objective, mission, plan, queue: createExecutionQueue(plan) }
}

export function startNextReadyTask(state: RuntimeState): RuntimeState {
  const ready = getReadyItems(state.queue, state.plan)[0]
  if (!ready) return state

  return {
    ...state,
    queue: startTask(state.queue, ready.taskId),
    plan: {
      ...state.plan,
      tasks: state.plan.tasks.map(task => task.id === ready.taskId ? { ...task, status: 'EXECUTING' as const } : task),
    },
  }
}

export function recordTaskResult(state: RuntimeState, taskId: string, success: boolean, actual: string, score: number): RuntimeState {
  const queue = completeTask(state.queue, taskId, success, success ? undefined : actual)
  const plan = advanceTask(state.plan, taskId, success ? 'success' : 'failure')
  const learning = evaluateResults(plan, { [taskId]: { actual, score } })
  const evaluation = evaluatePlan(plan)

  return {
    ...state,
    queue,
    plan,
    learning,
    replan: evaluation.recommendation === 'REPLAN_FAILED_TASKS' || evaluation.recommendation === 'LEARN_AND_REPLAN'
      ? createReplanDecision(plan, learning)
      : undefined,
  }
}

export function applyReplan(state: RuntimeState, agents: AgentProfile[]): RuntimeState {
  if (!state.replan) return state
  const plan = replanTasks(state.plan, agents, state.replan)
  return {
    ...state,
    plan,
    mission: { ...state.mission, tasks: plan.tasks, status: plan.tasks.some(task => task.status === 'BLOCKED') ? 'BLOCKED' : 'READY' },
    queue: createExecutionQueue(plan),
    replan: undefined,
  }
}
