export type IntegrationCapability =
  | 'MARKETING_READ'
  | 'MARKETING_CREATE'
  | 'MARKETING_PUBLISH_ORGANIC'
  | 'MARKETING_PUBLISH_PAID'
  | 'MARKETING_CHANGE_BUDGET'
  | 'CUSTOMER_READ'
  | 'FINANCE_READ'
  | 'PAYMENT_ACTION'
  | 'COMMUNICATION_SEND'

export type IntegrationConnection = {
  id: string
  provider: string
  account: string
  status: 'CONNECTED' | 'READY' | 'REQUIRES_SETUP'
  capabilities: IntegrationCapability[]
  updatedAt: string
}

export const DEFAULT_INTEGRATION_CAPABILITIES: Record<string, IntegrationCapability[]> = {
  meta: ['MARKETING_READ', 'MARKETING_CREATE'],
  'google-ads': ['MARKETING_READ', 'MARKETING_CREATE'],
  instagram: ['MARKETING_READ', 'MARKETING_CREATE', 'MARKETING_PUBLISH_ORGANIC'],
  whatsapp: ['CUSTOMER_READ', 'COMMUNICATION_SEND'],
  stripe: ['FINANCE_READ'],
  crm: ['CUSTOMER_READ'],
}

export function canUseIntegration(connection: IntegrationConnection | undefined, capability: IntegrationCapability) {
  return connection?.status === 'CONNECTED' && connection.capabilities.includes(capability)
}

export function requiresHumanApproval(capability: IntegrationCapability) {
  return capability === 'MARKETING_PUBLISH_PAID' || capability === 'MARKETING_CHANGE_BUDGET' || capability === 'PAYMENT_ACTION'
}
