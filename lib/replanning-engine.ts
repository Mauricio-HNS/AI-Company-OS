import type { AgentProfile, OperatingPlan, PlannedTask, TaskStatus } from './operating-engine'
import type { LearningRecord } from './evaluation-engine'
import { riskRequiresApproval, selectAgent } from './operating-engine'

export type ReplanReason = 'FAILED_TASK' | 'BLOCKED_TASK' | 'LOW_SCORE' | 'NEXT_CYCLE'

export type ReplanDecision = {
  reason: ReplanReason
  taskIds: string[]
  cycle: number
  requiresHumanReview: boolean
}

export function createReplanDecision(plan: OperatingPlan, learning: LearningRecord): ReplanDecision {
  const failed = learning.evaluations.filter(item => item.diagnosis === 'FAILURE').map(item => item.taskId)
  const blocked = learning.evaluations.filter(item => item.diagnosis === 'BLOCKED').map(item => item.taskId)
  const average = learning.evaluations.length
    ? learning.evaluations.reduce((sum, item) => sum + item.score, 0) / learning.evaluations.length
    : 0

  if (failed.length) return { reason: 'FAILED_TASK', taskIds: failed, cycle: plan.cycle + 1, requiresHumanReview: false }
  if (blocked.length) return { reason: 'BLOCKED_TASK', taskIds: blocked, cycle: plan.cycle + 1, requiresHumanReview: true }
  return { reason: average < 70 ? 'LOW_SCORE' : 'NEXT_CYCLE', taskIds: [], cycle: plan.cycle + 1, requiresHumanReview: false }
}

export function replanTasks(plan: OperatingPlan, agents: AgentProfile[], decision: ReplanDecision): OperatingPlan {
  const affected = new Set(decision.taskIds)

  const tasks: PlannedTask[] = plan.tasks.map(task => {
    if (!affected.has(task.id)) return task
    const replacement: PlannedTask = {
      ...task,
      id: `${task.id}-r${decision.cycle}`,
      status: 'READY' as TaskStatus,
      dependsOn: [],
      assignedAgentId: undefined,
    }
    const agent = selectAgent(replacement, agents)
    return agent
      ? { ...replacement, assignedAgentId: agent.id, approvalRequired: riskRequiresApproval(replacement.risk, agent) }
      : { ...replacement, status: 'BLOCKED' as TaskStatus }
  })

  return {
    ...plan,
    cycle: decision.cycle,
    tasks,
    createdAt: new Date().toISOString(),
  }
}
