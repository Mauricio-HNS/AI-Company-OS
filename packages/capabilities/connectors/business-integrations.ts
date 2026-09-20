export type BusinessSystemKind = 'CRM' | 'ERP' | 'FINANCE' | 'MARKETING' | 'COMMUNICATION' | 'SUPPORT' | 'DATA_WAREHOUSE';

export type IntegrationDirection = 'READ' | 'WRITE' | 'BIDIRECTIONAL';

export type IntegrationActionRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IntegrationCapability = {
  id: string
  name: string
  description: string
  direction: IntegrationDirection
  risk: IntegrationActionRisk
  requiresApproval: boolean
}

export type BusinessIntegration = {
  id: string
  companyId: string
  kind: BusinessSystemKind
  provider: string
  displayName: string
  status: 'DISCOVERED' | 'AUTHORIZED' | 'ACTIVE' | 'PAUSED' | 'ERROR'
  capabilities: IntegrationCapability[]
  externalSystemId?: string
  createdAt: string
  updatedAt: string
}

export type IntegrationAuthorization = {
  companyId: string
  integrationId: string
  approvedBy: string
  approvedAt: string
  allowedCapabilities: string[]
  expiresAt?: string
}

export type IntegrationExecutionRequest = {
  companyId: string
  integrationId: string
  capabilityId: string
  idempotencyKey: string
  payload: Record<string, unknown>
  requestedBy: string
}

export function canUseIntegration(
  integration: BusinessIntegration,
  authorization: IntegrationAuthorization | undefined,
  capabilityId: string,
): boolean {
  if (integration.status !== 'ACTIVE') return false
  if (!authorization || authorization.companyId !== integration.companyId) return false
  if (authorization.integrationId !== integration.id) return false
  if (!authorization.allowedCapabilities.includes(capabilityId)) return false
  if (authorization.expiresAt && new Date(authorization.expiresAt).getTime() <= Date.now()) return false
  return integration.capabilities.some(capability => capability.id === capabilityId)
}

export function requiresHumanApproval(
  integration: BusinessIntegration,
  capabilityId: string,
): boolean {
  const capability = integration.capabilities.find(item => item.id === capabilityId)
  return capability ? capability.requiresApproval || capability.risk === 'HIGH' || capability.risk === 'CRITICAL' : true
}

export function validateIntegrationRequest(
  request: IntegrationExecutionRequest,
  integration: BusinessIntegration,
): void {
  if (request.companyId !== integration.companyId) throw new Error('Integration tenant mismatch')
  if (!request.integrationId || !request.capabilityId) throw new Error('Integration and capability are required')
  if (!request.idempotencyKey.trim()) throw new Error('idempotencyKey is required')
  if (!request.requestedBy.trim()) throw new Error('requestedBy is required')
}
