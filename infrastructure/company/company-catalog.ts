import type { Company, CompanyId } from '../../domain/company/company.types'

export const companies: Record<CompanyId, Company> = {
  alpha: { id: 'alpha', name: 'Company Alpha', type: 'AI SaaS Platform', revenue: '€38,420', profit: '€12,840', health: '94%', agents: 18, missions: 4, objective: 'Launch the next recurring-revenue product' },
  beta: { id: 'beta', name: 'Company Beta', type: 'AI Commerce', revenue: '€21,830', profit: '€7,420', health: '91%', agents: 11, missions: 3, objective: 'Increase conversion and customer lifetime value' },
  gamma: { id: 'gamma', name: 'Company Gamma', type: 'AI Automation', revenue: '€4,280', profit: '€920', health: '87%', agents: 7, missions: 2, objective: 'Validate the first enterprise automation offer' },
}

export const companyIds = Object.keys(companies) as CompanyId[]

export function getCompany(companyId: string): Company {
  return companies[companyId as CompanyId] ?? companies.alpha
}
