export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type TaskStatus = 'BACKLOG' | 'PLANNING' | 'READY' | 'BLOCKED' | 'EXECUTING' | 'OBSERVING' | 'COMPLETED' | 'FAILED'

export type CompanyObjective = {
  id: string
  title: string
  description: string
  priority: number
  targetMetric: string
  targetValue: number
  currentValue: number
  deadline?: string
}

export type AgentProfile = {
  id: string
  name: string
  capabilities: string[]
  efficiency: number
  riskLimit: RiskLevel
  available: boolean
}

export type PlannedTask = {
  id: string
  title: string
  objectiveId: string
  requiredCapabilities: string[]
  priority: number
  risk: RiskLevel
  status: TaskStatus
  dependsOn: string[]
  assignedAgentId?: string
  approvalRequired: boolean
}

export type OperatingPlan = {
  objectiveId: string
  cycle: number
  tasks: PlannedTask[]
  expectedOutcome: string
  createdAt: string
}

const riskRank: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

export function riskRequiresApproval(risk: RiskLevel, agent: AgentProfile) {
  return riskRank[risk] > riskRank[agent.riskLimit]
}

export function selectAgent(task: PlannedTask, agents: AgentProfile[]) {
  return agents
    .filter(agent => agent.available)
    .filter(agent => task.requiredCapabilities.every(capability => agent.capabilities.includes(capability)))
    .sort((a, b) => {
      const aRisk = riskRequiresApproval(task.risk, a) ? 1 : 0
      const bRisk = riskRequiresApproval(task.risk, b) ? 1 : 0
      return aRisk - bRisk || b.efficiency - a.efficiency
    })[0]
}

export function createPlan(objective: CompanyObjective, agents: AgentProfile[], cycle: number): OperatingPlan {
  const gap = Math.max(0, objective.targetValue - objective.currentValue)
  const baseTasks: PlannedTask[] = [
    {
      id: `T-${cycle}-research`,
      title: `Validate signals for ${objective.title}`,
      objectiveId: objective.id,
      requiredCapabilities: ['research'],
      priority: objective.priority,
      risk: 'LOW',
      status: 'READY',
      dependsOn: [],
      approvalRequired: false,
    },
    {
      id: `T-${cycle}-experiment`,
      title: `Run controlled experiment for ${objective.title}`,
      objectiveId: objective.id,
      requiredCapabilities: ['experimentation'],
      priority: objective.priority,
      risk: 'MEDIUM',
      status: 'BLOCKED',
      dependsOn: [`T-${cycle}-research`],
      approvalRequired: false,
    },
    {
      id: `T-${cycle}-measurement`,
      title: `Measure outcome against ${objective.targetMetric}`,
      objectiveId: objective.id,
      requiredCapabilities: ['analytics'],
      priority: objective.priority,
      risk: 'LOW',
      status: 'BLOCKED',
      dependsOn: [`T-${cycle}-experiment`],
      approvalRequired: false,
    },
  ]

  const tasks = baseTasks.map(task => {
    const agent = selectAgent(task, agents)
    if (!agent) return { ...task, status: 'BLOCKED' as TaskStatus }
    return {
      ...task,
      assignedAgentId: agent.id,
      approvalRequired: riskRequiresApproval(task.risk, agent),
    }
  })

  return {
    objectiveId: objective.id,
    cycle,
    tasks,
    expectedOutcome: `Reduce the objective gap of ${gap} toward ${objective.targetValue} ${objective.targetMetric}`,
    createdAt: new Date().toISOString(),
  }
}

export function advanceTask(plan: OperatingPlan, taskId: string, result: 'success' | 'failure') {
  const tasks = plan.tasks.map(task => {
    if (task.id !== taskId) return task
    return { ...task, status: result === 'success' ? 'COMPLETED' as TaskStatus : 'FAILED' as TaskStatus }
  })

  const completedIds = new Set(tasks.filter(task => task.status === 'COMPLETED').map(task => task.id))
  return {
    ...plan,
    tasks: tasks.map(task => {
      if (task.status !== 'BLOCKED') return task
      const dependenciesReady = task.dependsOn.every(dependency => completedIds.has(dependency))
      return dependenciesReady ? { ...task, status: 'READY' as TaskStatus } : task
    }),
  }
}

export function evaluatePlan(plan: OperatingPlan) {
  const total = plan.tasks.length
  const completed = plan.tasks.filter(task => task.status === 'COMPLETED').length
  const failed = plan.tasks.filter(task => task.status === 'FAILED').length
  const blocked = plan.tasks.filter(task => task.status === 'BLOCKED').length
  const score = total === 0 ? 0 : Math.round(((completed + (total - blocked - failed) * 0.25) / total) * 100)

  return {
    score: Math.max(0, Math.min(100, score)),
    completed,
    failed,
    blocked,
    recommendation: failed > 0 ? 'REPLAN_FAILED_TASKS' : blocked > 0 ? 'UNBLOCK_DEPENDENCIES' : completed === total ? 'LEARN_AND_REPLAN' : 'CONTINUE_EXECUTION',
  } as const
}
