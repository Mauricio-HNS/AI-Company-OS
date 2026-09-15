export type AutonomyLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'

export type CapabilityAutonomy = {
  capability: string
  level: AutonomyLevel
  grantedAt: string
  basedOnExecutions: number
  failureRate: number
  lastFailureAt?: string
  decayTrigger?: string
}

const rank: Record<AutonomyLevel, number> = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 }
const levels: AutonomyLevel[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH']

export function grantAutonomy(capability: string, level: AutonomyLevel, basedOnExecutions = 0): CapabilityAutonomy {
  return { capability, level, grantedAt: new Date().toISOString(), basedOnExecutions, failureRate: 0 }
}

export function recordAutonomyExecution(state: CapabilityAutonomy, success: boolean, failureThreshold = 0.2): CapabilityAutonomy {
  const executions = state.basedOnExecutions + 1
  const failures = Math.round(state.failureRate * state.basedOnExecutions) + (success ? 0 : 1)
  const failureRate = failures / executions
  const highImpactFailure = !success && state.level === 'HIGH'
  const thresholdExceeded = failureRate >= failureThreshold && executions >= 5
  if (!highImpactFailure && !thresholdExceeded) return { ...state, basedOnExecutions: executions, failureRate }
  const next = levels[Math.max(0, rank[state.level] - 1)]
  return { ...state, level: next, basedOnExecutions: executions, failureRate, lastFailureAt: new Date().toISOString(), decayTrigger: highImpactFailure ? 'HIGH_IMPACT_FAILURE' : 'FAILURE_RATE_THRESHOLD' }
}
