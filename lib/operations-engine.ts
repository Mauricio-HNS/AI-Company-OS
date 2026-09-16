export type AgentStatus = 'WORKING' | 'REVIEW' | 'WAITING' | 'OFFLINE'
export type TaskStatus = 'BACKLOG' | 'PLANNING' | 'EXECUTING' | 'REVIEW' | 'COMPLETED'
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

export type CompanyAgent = {
  id: string
  name: string
  role: string
  department: string
  objective: string
  status: AgentStatus
  performance: number
}

export type CompanyTask = {
  id: string
  title: string
  agent: string
  department: string
  status: TaskStatus
  priority: Priority
  progress: number
}

const agents: CompanyAgent[] = [
  { id: 'ai-director', name: 'AI Director', role: 'Orchestration & strategy', department: 'Executive', objective: 'Coordinate company goals and autonomous execution.', status: 'WORKING', performance: 98 },
  { id: 'growth-agent', name: 'Growth Agent', role: 'Marketing & acquisition', department: 'Growth', objective: 'Increase qualified demand and conversion.', status: 'WORKING', performance: 91 },
  { id: 'sales-agent', name: 'Sales Agent', role: 'Pipeline & conversion', department: 'Sales', objective: 'Move qualified opportunities through the funnel.', status: 'REVIEW', performance: 87 },
  { id: 'analyst-agent', name: 'Analyst Agent', role: 'Intelligence & insight', department: 'Intelligence', objective: 'Turn company data into actionable decisions.', status: 'WAITING', performance: 76 },
]

const tasks: CompanyTask[] = [
  { id: 'TASK-001', title: 'Review growth campaign performance', agent: 'growth-agent', department: 'Growth', status: 'EXECUTING', priority: 'HIGH', progress: 72 },
  { id: 'TASK-002', title: 'Qualify new sales opportunities', agent: 'sales-agent', department: 'Sales', status: 'REVIEW', priority: 'HIGH', progress: 84 },
  { id: 'TASK-003', title: 'Prepare weekly intelligence report', agent: 'analyst-agent', department: 'Intelligence', status: 'PLANNING', priority: 'MEDIUM', progress: 24 },
  { id: 'TASK-004', title: 'Synchronize company objectives', agent: 'ai-director', department: 'Executive', status: 'COMPLETED', priority: 'MEDIUM', progress: 100 },
  { id: 'TASK-005', title: 'Build next customer segment', agent: 'growth-agent', department: 'Growth', status: 'BACKLOG', priority: 'LOW', progress: 0 },
]

export function getCompanyAgents(_companyId: string): CompanyAgent[] { return agents.map(agent => ({ ...agent })) }
export function getCompanyTasks(_companyId: string): CompanyTask[] { return tasks.map(task => ({ ...task })) }

export function summarizeOperations(companyId: string) {
  const companyTasks = getCompanyTasks(companyId)
  return {
    backlog: companyTasks.filter(t => t.status === 'BACKLOG').length,
    planning: companyTasks.filter(t => t.status === 'PLANNING').length,
    executing: companyTasks.filter(t => t.status === 'EXECUTING').length,
    review: companyTasks.filter(t => t.status === 'REVIEW').length,
    completed: companyTasks.filter(t => t.status === 'COMPLETED').length,
  }
}
