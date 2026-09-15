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

const ROLE_PERMISSIONS: Record<CompanyRole, CompanyPermission[]> = {
  OWNER: ['VIEW_COMPANY','MONITOR_OPERATION','VIEW_FINANCE','MANAGE_STOCK','CREATE_MISSION','RUN_EXPERIMENT','CHANGE_PRICES','APPROVE_SPEND','MANAGE_USERS','EMERGENCY_STOP'],
  MANAGER: ['VIEW_COMPANY','MONITOR_OPERATION','VIEW_FINANCE','MANAGE_STOCK','CREATE_MISSION','RUN_EXPERIMENT','CHANGE_PRICES','APPROVE_SPEND','EMERGENCY_STOP'],
  EMPLOYEE: ['VIEW_COMPANY','MONITOR_OPERATION','MANAGE_STOCK'],
  VIEWER: ['VIEW_COMPANY'],
}

export const CRITICAL_PERMISSIONS: CompanyPermission[] = [
  'CHANGE_PRICES',
  'APPROVE_SPEND',
  'MANAGE_USERS',
  'EMERGENCY_STOP',
]

export type CompanySession = {
  companyId: string
  userId: string
  displayName: string
  role: CompanyRole
  authenticatedAt: string
  sessionId: string
}

export function hasPermission(role: CompanyRole, permission: CompanyPermission) {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function requiresManagerApproval(permission: CompanyPermission) {
  return CRITICAL_PERMISSIONS.includes(permission)
}

export function createSession(input: Omit<CompanySession, 'authenticatedAt' | 'sessionId'>): CompanySession {
  return {
    ...input,
    authenticatedAt: new Date().toISOString(),
    sessionId: `${input.companyId}-${input.userId}-${Date.now()}`,
  }
}

export function canExecute(role: CompanyRole, permission: CompanyPermission, approvalGranted = false) {
  if (!hasPermission(role, permission)) return false
  if (requiresManagerApproval(permission) && !approvalGranted) return false
  return true
}
