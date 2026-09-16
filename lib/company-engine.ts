export type MissionStage = {
  id: string
  title: string
  agent: string
  objective: string
  status: 'complete' | 'active' | 'waiting'
  authority: string
  risk: 'low' | 'medium' | 'high'
}

export type MissionEvent = { id: string; agent: string; message: string; time: string }

export type CompanyMission = {
  title: string
  objective: string
  progress: number
  capital: number
  expectedRevenue: number
  stages: MissionStage[]
  events: MissionEvent[]
}

export const autonomousSaaSMission: CompanyMission = {
  title: 'Launch the next recurring-revenue product',
  objective: 'Validate, launch and grow a new autonomous SaaS offer.',
  progress: 68,
  capital: 12000,
  expectedRevenue: 75000,
  stages: [
    { id: 'research', title: 'Market research', agent: 'Analyst Agent', objective: 'Identify the highest-value opportunity.', status: 'complete', authority: 'Simulation', risk: 'low' },
    { id: 'mvp', title: 'Build MVP', agent: 'Product Agent', objective: 'Create the first usable product version.', status: 'active', authority: 'Simulation', risk: 'low' },
    { id: 'growth', title: 'Growth launch', agent: 'Growth Agent', objective: 'Acquire the first qualified customers.', status: 'waiting', authority: 'Simulation', risk: 'medium' },
    { id: 'optimize', title: 'Optimize revenue', agent: 'AI Director', objective: 'Improve conversion and retention.', status: 'waiting', authority: 'Simulation', risk: 'medium' },
  ],
  events: [
    { id: 'e1', agent: 'Analyst Agent', message: 'validated target segment', time: '09:42' },
    { id: 'e2', agent: 'Product Agent', message: 'completed MVP architecture', time: '09:48' },
    { id: 'e3', agent: 'AI Director', message: 'assigned launch preparation', time: '09:55' },
  ],
}

export function advanceMission(mission: CompanyMission): CompanyMission {
  const next = { ...mission, stages: mission.stages.map(stage => ({ ...stage })), events: [...mission.events] }
  const index = next.stages.findIndex(stage => stage.status === 'active')
  if (index >= 0) {
    next.stages[index].status = 'complete'
    const following = next.stages[index + 1]
    if (following) following.status = 'active'
    next.progress = Math.min(100, next.progress + 8)
  }
  return next
}
