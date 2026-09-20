export type StrategyStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'

export type StrategyTrigger =
  | { type: 'IMMEDIATE' }
  | { type: 'DATE'; at: string }
  | { type: 'CONDITION'; condition: StrategyCondition }
  | { type: 'STRATEGY_COMPLETED'; strategyId: string }

export type StrategyCondition = {
  metric: string
  operator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ'
  value: number | string
  unit?: string
}

export type StrategyEndCondition =
  | { type: 'DATE'; at: string }
  | { type: 'GOAL'; condition: StrategyCondition }
  | { type: 'CONDITION'; condition: StrategyCondition }
  | { type: 'STRATEGY_ACTIVATED'; strategyId: string }
  | { type: 'MANUAL' }
  | { type: 'NEVER' }

export type StrategyEndMode = 'ANY' | 'ALL'

export type StrategyTransition =
  | { type: 'ACTIVATE_STRATEGY'; strategyId: string }
  | { type: 'RESTORE_PREVIOUS' }
  | { type: 'REQUEST_HUMAN_DECISION' }
  | { type: 'PAUSE_AND_OBSERVE' }

export type StrategyRule = {
  id: string
  description: string
  effect: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL'
}

export type OperatingStrategy = {
  id: string
  companyId: string
  name: string
  objective: string
  priority: number
  status: StrategyStatus
  startsWhen: StrategyTrigger
  endsWhen: {
    mode: StrategyEndMode
    conditions: StrategyEndCondition[]
  }
  transition: StrategyTransition
  rules: StrategyRule[]
  createdAt: string
  updatedAt: string
}

export type StrategyTransitionEvent = {
  strategyId: string
  companyId: string
  fromStatus: StrategyStatus
  toStatus: StrategyStatus
  reason: string
  occurredAt: string
}

export function createOperatingStrategy(input: Omit<OperatingStrategy, 'status'>): OperatingStrategy {
  if (!input.companyId.trim()) throw new Error('companyId is required')
  if (!input.name.trim()) throw new Error('strategy name is required')
  if (!input.objective.trim()) throw new Error('strategy objective is required')
  if (input.priority < 0) throw new Error('strategy priority cannot be negative')
  if (input.endsWhen.conditions.length === 0) throw new Error('at least one end condition is required')
  return { ...input, status: 'DRAFT' }
}

export function activateStrategy(strategy: OperatingStrategy, now = new Date()): OperatingStrategy {
  if (strategy.status !== 'DRAFT' && strategy.status !== 'SCHEDULED' && strategy.status !== 'PAUSED') return strategy
  if (!triggerIsSatisfied(strategy.startsWhen, now)) return strategy
  return { ...strategy, status: 'ACTIVE', updatedAt: now.toISOString() }
}

export function evaluateStrategyEnd(
  strategy: OperatingStrategy,
  now: Date,
  observed: Record<string, number | string> = {},
): boolean {
  if (strategy.status !== 'ACTIVE') return false
  if (strategy.endsWhen.conditions.some(condition => condition.type === 'MANUAL' || condition.type === 'NEVER')) {
    const terminating = strategy.endsWhen.conditions.filter(condition => condition.type !== 'MANUAL' && condition.type !== 'NEVER')
    if (terminating.length === 0) return false
  }
  const results = strategy.endsWhen.conditions
    .filter(condition => condition.type !== 'MANUAL' && condition.type !== 'NEVER')
    .map(condition => endConditionIsSatisfied(condition, now, observed))
  return results.length > 0 && (strategy.endsWhen.mode === 'ALL' ? results.every(Boolean) : results.some(Boolean))
}

export function completeStrategy(
  strategy: OperatingStrategy,
  now = new Date(),
): OperatingStrategy {
  if (strategy.status !== 'ACTIVE') return strategy
  return { ...strategy, status: 'COMPLETED', updatedAt: now.toISOString() }
}

export function strategyCanOverride(candidate: OperatingStrategy, current: OperatingStrategy): boolean {
  if (candidate.companyId !== current.companyId) return false
  return candidate.priority < current.priority
}

function triggerIsSatisfied(trigger: StrategyTrigger, now: Date): boolean {
  if (trigger.type === 'IMMEDIATE') return true
  if (trigger.type === 'DATE') return new Date(trigger.at).getTime() <= now.getTime()
  return false
}

function endConditionIsSatisfied(
  condition: StrategyEndCondition,
  now: Date,
  observed: Record<string, number | string>,
): boolean {
  if (condition.type === 'DATE') return new Date(condition.at).getTime() <= now.getTime()
  if (condition.type === 'GOAL' || condition.type === 'CONDITION') {
    const actual = observed[condition.condition.metric]
    return actual !== undefined && compare(actual, condition.condition.operator, condition.condition.value)
  }
  return false
}

function compare(
  actual: number | string,
  operator: StrategyCondition['operator'],
  expected: number | string,
): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (operator === 'GT') return actual > expected
    if (operator === 'GTE') return actual >= expected
    if (operator === 'LT') return actual < expected
    if (operator === 'LTE') return actual <= expected
    return actual === expected
  }
  if (operator === 'EQ') return String(actual) === String(expected)
  return false
}
