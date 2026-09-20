export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ApprovalState = 'NOT_REQUIRED' | 'REQUIRED' | 'APPROVED' | 'REJECTED'

export type PolicyDecision = {
  allowed: boolean
  reason: string
  riskLevel: RiskLevel
  approval: ApprovalState
}

export type Permission = string

export type AuthorizationContext = {
  tenantId: string
  companyId: string
  subjectId: string
  permission: Permission
}
