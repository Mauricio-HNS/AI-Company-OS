import type { RiskLevel, TaskStatus } from './operating-engine'

export type BrainDecisionStatus =
  | 'PROPOSED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'CANCELLED'

export type RuntimeBrainDecision = {
  decisionId: string
  companyId: string
  objective: string
  action: 'OBSERVE' | 'PLAN' | 'REQUEST_APPROVAL' | 'NO_ACTION'
  reason: string
  riskLevel: RiskLevel
  confidence: number
  approvalRequired: boolean
  preconditions: string[]
  status: BrainDecisionStatus
  createdAt: string
}

export function registerBrainDecision(
  decision: RuntimeBrainDecision,
): RuntimeBrainDecision | undefined {
  if (decision.confidence < 0 || decision.confidence > 1) return undefined
  if (decision.riskLevel === 'HIGH' || decision.riskLevel === 'CRITICAL') {
    return { ...decision, approvalRequired: true, status: 'APPROVAL_REQUIRED' }
  }
  return {
    ...decision,
    status: decision.approvalRequired ? 'APPROVAL_REQUIRED' : 'PROPOSED',
  }
}

export function approveBrainDecision(
  decision: RuntimeBrainDecision,
  preconditionsSatisfied: boolean,
): RuntimeBrainDecision {
  if (!preconditionsSatisfied || decision.status !== 'APPROVAL_REQUIRED') return decision
  return { ...decision, status: 'APPROVED' }
}

export function rejectBrainDecision(decision: RuntimeBrainDecision): RuntimeBrainDecision {
  if (decision.status !== 'APPROVAL_REQUIRED') return decision
  return { ...decision, status: 'REJECTED' }
}

export function markBrainDecisionExecuted(decision: RuntimeBrainDecision): RuntimeBrainDecision {
  if (decision.status !== 'APPROVED') return decision
  return { ...decision, status: 'EXECUTED' }
}

export function decisionCanEnterExecution(decision: RuntimeBrainDecision): boolean {
  if (decision.action === 'NO_ACTION' || decision.action === 'REQUEST_APPROVAL') return false
  if (decision.approvalRequired) return decision.status === 'APPROVED'
  return decision.status === 'PROPOSED' || decision.status === 'APPROVED'
}

export function decisionToTask(decision: RuntimeBrainDecision, objectiveId = decision.companyId): {
  id: string
  title: string
  objectiveId: string
  requiredCapabilities: string[]
  priority: number
  risk: RiskLevel
  status: TaskStatus
  dependsOn: string[]
  approvalRequired: boolean
} | undefined {
  if (!decisionCanEnterExecution(decision)) return undefined
  if (decision.action === 'OBSERVE') {
    return {
      id: `BRAIN-${decision.decisionId}`,
      title: decision.objective,
      objectiveId,
      requiredCapabilities: ['analytics'],
      priority: 1,
      risk: decision.riskLevel,
      status: 'READY',
      dependsOn: [],
      approvalRequired: decision.approvalRequired,
    }
  }
  if (decision.action === 'PLAN') {
    return {
      id: `BRAIN-${decision.decisionId}`,
      title: `Plan: ${decision.objective}`,
      objectiveId: decision.companyId,
      requiredCapabilities: ['research'],
      priority: 1,
      risk: decision.riskLevel,
      status: 'READY',
      dependsOn: [],
      approvalRequired: decision.approvalRequired,
    }
  }
  return undefined
}
