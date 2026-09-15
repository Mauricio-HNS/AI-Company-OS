export type SafetyLevel = 'NORMAL' | 'WARNING' | 'PAUSE' | 'ABORT_TASK' | 'ABORT_EXPERIMENT' | 'EMERGENCY_STOP'

export type SafetyRule = {
  id: string
  name: string
  level: Exclude<SafetyLevel, 'NORMAL'>
  predicate: (metrics: Record<string, number>) => boolean
}

export type SafetyDecision = {
  level: SafetyLevel
  triggeredRuleIds: string[]
  reason: string
  createdAt: string
}

export function monitorSafety(metrics: Record<string, number>, rules: SafetyRule[]): SafetyDecision {
  const triggered = rules.filter(rule => rule.predicate(metrics))
  const rank: Record<SafetyLevel, number> = { NORMAL: 0, WARNING: 1, PAUSE: 2, ABORT_TASK: 3, ABORT_EXPERIMENT: 4, EMERGENCY_STOP: 5 }
  const level = triggered.reduce<SafetyLevel>((highest, rule) => rank[rule.level] > rank[highest] ? rule.level : highest, 'NORMAL')
  return { level, triggeredRuleIds: triggered.map(rule => rule.id), reason: triggered.length ? triggered.map(rule => rule.name).join('; ') : 'No safety anomaly detected.', createdAt: new Date().toISOString() }
}

export function createThresholdRule(input: { id: string; name: string; metric: string; operator: 'LT' | 'LTE' | 'GT' | 'GTE'; threshold: number; level: Exclude<SafetyLevel, 'NORMAL'> }): SafetyRule {
  const predicate = (metrics: Record<string, number>) => {
    const value = metrics[input.metric]
    if (value === undefined) return false
    if (input.operator === 'LT') return value < input.threshold
    if (input.operator === 'LTE') return value <= input.threshold
    if (input.operator === 'GT') return value > input.threshold
    return value >= input.threshold
  }
  return { id: input.id, name: input.name, level: input.level, predicate }
}

export function assertExecutionSafe(decision: SafetyDecision) {
  if (decision.level === 'ABORT_TASK' || decision.level === 'ABORT_EXPERIMENT' || decision.level === 'EMERGENCY_STOP') throw new Error(`Execution blocked by safety monitor: ${decision.reason}`)
}
