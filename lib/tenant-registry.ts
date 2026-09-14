export type TenantStatus = 'operational' | 'building' | 'paused'

export type Tenant = {
  id: string
  name: string
  sector: string
  status: TenantStatus
  health: number
  revenue: number
  profit: number
  agents: number
  missions: number
  objective: string
  owner: string
}

export const tenants: Tenant[] = [
  { id: 'alpha', name: 'Company Alpha', sector: 'AI SaaS Platform', status: 'operational', health: 94, revenue: 38420, profit: 12840, agents: 18, missions: 4, objective: 'Launch the next recurring-revenue product', owner: 'AI CEO' },
  { id: 'beta', name: 'Company Beta', sector: 'AI Commerce', status: 'operational', health: 91, revenue: 21830, profit: 7420, agents: 11, missions: 3, objective: 'Increase conversion and customer lifetime value', owner: 'AI CEO' },
  { id: 'gamma', name: 'Company Gamma', sector: 'AI Automation', status: 'building', health: 87, revenue: 4280, profit: 920, agents: 7, missions: 2, objective: 'Validate the first enterprise automation offer', owner: 'AI CEO' },
]

export function getTenant(id: string) {
  return tenants.find((tenant) => tenant.id === id)
}

export function portfolioTotals() {
  return tenants.reduce((acc, tenant) => ({
    revenue: acc.revenue + tenant.revenue,
    profit: acc.profit + tenant.profit,
    agents: acc.agents + tenant.agents,
    missions: acc.missions + tenant.missions,
  }), { revenue: 0, profit: 0, agents: 0, missions: 0 })
}

export const tenantModules = ['Agents', 'Missions', 'Tasks', 'Products', 'Customers', 'Finance', 'Intelligence', 'Knowledge', 'Operations', 'Security', 'Settings'] as const
