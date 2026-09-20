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

export type CompanyRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'VIEWER'

export type CompanyPermission =
  | 'VIEW_COMPANY'
  | 'MONITOR_OPERATION'
  | 'VIEW_FINANCE'
  | 'MANAGE_STOCK'
  | 'CREATE_MISSION'
  | 'RUN_EXPERIMENT'
  | 'CHANGE_PRICES'
  | 'APPROVE_SPEND'
  | 'MANAGE_USERS'
  | 'EMERGENCY_STOP'

export type CompanyAuthorization = {
  role: CompanyRole
  permission: CompanyPermission
  approvalGranted?: boolean
}
