export type ExecutionStatus =
  | 'READY'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'CANCELLED'

export type ExecutionContext = {
  tenantId: string
  companyId: string
  executionId: string
  initiatedBy: string
  dryRun?: boolean
}

export type ExecutionResult<T = unknown> = {
  success: boolean
  status: ExecutionStatus
  value?: T
  error?: string
}
