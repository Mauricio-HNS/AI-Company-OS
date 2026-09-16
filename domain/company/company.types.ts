export type CompanyId = 'alpha' | 'beta' | 'gamma'

export type Company = {
  id: CompanyId
  name: string
  type: string
  revenue: string
  profit: string
  health: string
  agents: number
  missions: number
  objective: string
}

export type CompanySummary = Pick<Company, 'id' | 'name' | 'type' | 'agents' | 'missions' | 'objective'>
