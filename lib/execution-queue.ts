import type { AgentProfile, OperatingPlan, PlannedTask, TaskStatus } from './operating-engine'

export type QueueItem = {
  taskId: string
  agentId?: string
  status: TaskStatus
  attempts: number
  enqueuedAt: string
  startedAt?: string
  finishedAt?: string
  error?: string
}

export type ExecutionQueue = {
  items: QueueItem[]
}

export function createExecutionQueue(plan: OperatingPlan): ExecutionQueue {
  return {
    items: plan.tasks.map(task => ({
      taskId: task.id,
      agentId: task.assignedAgentId,
      status: task.status,
      attempts: 0,
      enqueuedAt: new Date().toISOString(),
    })),
  }
}

export function getReadyItems(queue: ExecutionQueue, plan: OperatingPlan) {
  const completed = new Set(plan.tasks.filter(task => task.status === 'COMPLETED').map(task => task.id))
  return queue.items.filter(item => {
    const task = plan.tasks.find(candidate => candidate.id === item.taskId)
    return item.status === 'READY' && !!task && task.dependsOn.every(id => completed.has(id))
  })
}

export function startTask(queue: ExecutionQueue, taskId: string): ExecutionQueue {
  return {
    items: queue.items.map(item => item.taskId === taskId
      ? { ...item, status: 'EXECUTING' as TaskStatus, attempts: item.attempts + 1, startedAt: new Date().toISOString(), error: undefined }
      : item),
  }
}

export function completeTask(queue: ExecutionQueue, taskId: string, success: boolean, error?: string): ExecutionQueue {
  return {
    items: queue.items.map(item => item.taskId === taskId
      ? { ...item, status: success ? 'COMPLETED' as TaskStatus : 'FAILED' as TaskStatus, finishedAt: new Date().toISOString(), error }
      : item),
  }
}

export function synchronizeQueue(queue: ExecutionQueue, plan: OperatingPlan, agents: AgentProfile[]): ExecutionQueue {
  return {
    items: queue.items.map(item => {
      const task = plan.tasks.find(candidate => candidate.id === item.taskId)
      if (!task) return item
      const agent = agents.find(candidate => candidate.id === task.assignedAgentId)
      if (!agent?.available && (item.status === 'READY' || item.status === 'EXECUTING')) {
        return { ...item, status: 'BLOCKED' as TaskStatus, error: 'Assigned agent unavailable' }
      }
      return { ...item, status: task.status, agentId: task.assignedAgentId }
    }),
  }
}
