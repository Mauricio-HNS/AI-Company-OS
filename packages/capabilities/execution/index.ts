import type { ExecutionStatus } from '@/packages/foundation/execution'

export type ExecutionTask = {
  id: string
  status: ExecutionStatus
  dependsOn?: string[]
  agentId?: string
}

export type ExecutionQueueItem = {
  taskId: string
  agentId?: string
  status: ExecutionStatus
  attempts: number
  enqueuedAt: string
  startedAt?: string
  finishedAt?: string
  error?: string
}

export type ExecutionQueue = {
  items: ExecutionQueueItem[]
}

export function createExecutionQueue(tasks: ExecutionTask[]): ExecutionQueue {
  return {
    items: tasks.map(task => ({
      taskId: task.id,
      agentId: task.agentId,
      status: task.status,
      attempts: 0,
      enqueuedAt: new Date().toISOString(),
    })),
  }
}

export function getReadyItems(queue: ExecutionQueue, tasks: ExecutionTask[]): ExecutionQueueItem[] {
  const completed = new Set(tasks.filter(task => task.status === 'COMPLETED').map(task => task.id))
  return queue.items.filter(item => {
    const task = tasks.find(candidate => candidate.id === item.taskId)
    return item.status === 'READY' && !!task && (task.dependsOn ?? []).every(id => completed.has(id))
  })
}

export function startExecution(queue: ExecutionQueue, taskId: string): ExecutionQueue {
  return {
    items: queue.items.map(item => item.taskId === taskId
      ? { ...item, status: 'EXECUTING', attempts: item.attempts + 1, startedAt: new Date().toISOString(), error: undefined }
      : item),
  }
}

export function completeExecution(queue: ExecutionQueue, taskId: string, success: boolean, error?: string): ExecutionQueue {
  return {
    items: queue.items.map(item => item.taskId === taskId
      ? { ...item, status: success ? 'COMPLETED' : 'FAILED', finishedAt: new Date().toISOString(), error }
      : item),
  }
}

export function enqueueExecution(queue: ExecutionQueue, taskId: string, agentId?: string): ExecutionQueue {
  if (queue.items.some(item => item.taskId === taskId)) return queue
  return {
    items: [...queue.items, {
      taskId,
      agentId,
      status: 'READY',
      attempts: 0,
      enqueuedAt: new Date().toISOString(),
    }],
  }
}
