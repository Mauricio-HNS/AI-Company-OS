import type { OperatingPlan } from './operating-engine'

export type TaskEvaluation = {
  taskId: string
  expected: string
  actual: string
  score: number
  diagnosis: 'SUCCESS' | 'PARTIAL' | 'FAILURE' | 'BLOCKED'
  lesson?: string
}

export type LearningRecord = {
  id: string
  objectiveId: string
  cycle: number
  evaluations: TaskEvaluation[]
  summary: string
  createdAt: string
}

export function evaluateTask(taskId: string, expected: string, actual: string, score: number): TaskEvaluation {
  const normalized = Math.max(0, Math.min(100, Math.round(score)))
  const diagnosis = normalized >= 80 ? 'SUCCESS' : normalized >= 50 ? 'PARTIAL' : normalized === 0 ? 'BLOCKED' : 'FAILURE'

  return {
    taskId,
    expected,
    actual,
    score: normalized,
    diagnosis,
    lesson: diagnosis === 'SUCCESS'
      ? 'Preserve the successful approach and test whether it generalizes.'
      : 'Review assumptions, inputs, agent fit and execution constraints before the next cycle.',
  }
}

export function evaluatePlan(plan: OperatingPlan, results: Record<string, { actual: string; score: number }>): LearningRecord {
  const evaluations = plan.tasks.map(task => {
    const result = results[task.id]
    if (!result) return evaluateTask(task.id, task.title, 'No result recorded', 0)
    return evaluateTask(task.id, task.title, result.actual, result.score)
  })

  const average = evaluations.length
    ? Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length)
    : 0

  const successes = evaluations.filter(evaluation => evaluation.diagnosis === 'SUCCESS').length
  const failures = evaluations.filter(evaluation => evaluation.diagnosis === 'FAILURE').length
  const blocked = evaluations.filter(evaluation => evaluation.diagnosis === 'BLOCKED').length

  return {
    id: `L-${plan.objectiveId}-${plan.cycle}-${Date.now()}`,
    objectiveId: plan.objectiveId,
    cycle: plan.cycle,
    evaluations,
    summary: `Average score ${average}/100. Successes: ${successes}. Failures: ${failures}. Blocked: ${blocked}.`,
    createdAt: new Date().toISOString(),
  }
}

export function nextPlanAction(record: LearningRecord) {
  const hasFailure = record.evaluations.some(item => item.diagnosis === 'FAILURE')
  const hasBlocked = record.evaluations.some(item => item.diagnosis === 'BLOCKED')
  const complete = record.evaluations.length > 0 && record.evaluations.every(item => item.diagnosis === 'SUCCESS')

  if (complete) return 'LEARN_AND_REPLAN' as const
  if (hasFailure) return 'REPLAN_FAILED_TASKS' as const
  if (hasBlocked) return 'UNBLOCK_DEPENDENCIES' as const
  return 'CONTINUE_EXECUTION' as const
}
