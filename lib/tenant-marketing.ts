import type { IntegrationConnection } from './integration-control'

export type MarketingCampaign = {
  id: string
  companyId: string
  name: string
  channel: string
  objective: string
  budget: number
  duration: number
  audience: string
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PAUSED' | 'REJECTED'
  createdAt: string
  updatedAt: string
}

export type MarketingAuditEvent = {
  id: string
  companyId: string
  type: 'CAMPAIGN_CREATED' | 'CAMPAIGN_APPROVED' | 'CAMPAIGN_REJECTED' | 'CAMPAIGN_PAUSED' | 'CAMPAIGN_RESUMED' | 'EMERGENCY_STOP'
  campaignId?: string
  message: string
  createdAt: string
}

export type TenantMarketingState = {
  companyId: string
  campaigns: MarketingCampaign[]
  audit: MarketingAuditEvent[]
  updatedAt: string
}

export const MARKETING_STORAGE_PREFIX = 'company-marketing:'
export const INTEGRATION_STORAGE_PREFIX = 'company-integrations:'

export function marketingStorageKey(companyId: string) {
  return `${MARKETING_STORAGE_PREFIX}${encodeURIComponent(companyId)}`
}

export function integrationStorageKey(companyId: string) {
  return `${INTEGRATION_STORAGE_PREFIX}${encodeURIComponent(companyId)}`
}

export function emptyTenantMarketingState(companyId: string): TenantMarketingState {
  return { companyId, campaigns: [], audit: [], updatedAt: new Date().toISOString() }
}

export function readTenantMarketingState(companyId: string): TenantMarketingState {
  if (typeof window === 'undefined') return emptyTenantMarketingState(companyId)
  try {
    const raw = localStorage.getItem(marketingStorageKey(companyId))
    if (!raw) return emptyTenantMarketingState(companyId)
    const parsed = JSON.parse(raw) as TenantMarketingState
    if (parsed.companyId !== companyId || !Array.isArray(parsed.campaigns) || !Array.isArray(parsed.audit)) {
      return emptyTenantMarketingState(companyId)
    }
    return parsed
  } catch {
    return emptyTenantMarketingState(companyId)
  }
}

export function saveTenantMarketingState(state: TenantMarketingState) {
  if (typeof window === 'undefined') return
  if (!state.companyId) throw new Error('Marketing state requires a companyId')
  localStorage.setItem(marketingStorageKey(state.companyId), JSON.stringify({ ...state, updatedAt: new Date().toISOString() }))
}

export function readTenantConnections(companyId: string): IntegrationConnection[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(integrationStorageKey(companyId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as IntegrationConnection[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function appendMarketingAudit(state: TenantMarketingState, event: Omit<MarketingAuditEvent, 'id' | 'companyId' | 'createdAt'>): TenantMarketingState {
  const now = new Date().toISOString()
  return {
    ...state,
    audit: [{ ...event, id: `audit-${Date.now()}`, companyId: state.companyId, createdAt: now }, ...state.audit].slice(0, 500),
    updatedAt: now,
  }
}
