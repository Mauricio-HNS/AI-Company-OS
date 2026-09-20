export type TenantId = string
export type CompanyId = string
export type AgentId = string
export type UserId = string

export type TenantContext = {
  tenantId: TenantId
  companyId: CompanyId
}

export function createTenantContext(tenantId: TenantId, companyId: CompanyId): TenantContext {
  if (!tenantId.trim()) throw new Error('tenantId is required')
  if (!companyId.trim()) throw new Error('companyId is required')
  return { tenantId, companyId }
}
