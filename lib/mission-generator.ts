import type { AgentProfile, CompanyObjective, OperatingPlan, PlannedTask, RiskLevel, TaskStatus } from './operating-engine'

export type MissionStatus = 'DRAFT' | 'READY' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'BLOCKED'

export type Mission = {
  id: string
  objectiveId: string
  title: string
  description: string
  metric: string
  targetValue: number
  deadline?: string
  budget?: number
  constraints: string[]
  priority: number
  status: MissionStatus
  tasks: PlannedTask[]
  createdAt: string
}

export type MissionRequest = {
  objective: CompanyObjective
  deadline?: string
  budget?: number
  constraints?: string[]
}

const capabilityByKeyword: Array<{ keywords: string[]; capability: string }> = [
  { keywords: ['research', 'market', 'competitor', 'opportunit'], capability: 'research' },
  { keywords: ['experiment', 'growth', 'conversion', 'campaign', 'test'], capability: 'experimentation' },
  { keywords: ['revenue', 'profit', 'cost', 'budget', 'finance'], capability: 'finance' },
  { keywords: ['measure', 'metric', 'analytics', 'kpi', 'outcome'], capability: 'analytics' },
  { keywords: ['product', 'launch', 'feature'], capability: 'product' },
]

function inferCapability(text: string, fallback: string) {
  const normalized = text.toLowerCase()
  return capabilityByKeyword.find(item => item.keywords.some(keyword => normalized.includes(keyword)))?.capability ?? fallback
}

function task(
  id: string,
  title: string,
  objectiveId: string,
  capability: string,
  priority: number,
  risk: RiskLevel,
  dependsOn: string[] = [],
): PlannedTask {
  return {
    id,
    title,
    objectiveId,
    requiredCapabilities: [capability],
    priority,
    risk,
    status: dependsOn.length ? 'BLOCKED' : 'READY',
    dependsOn,
    approvalRequired: risk === 'HIGH' || risk === 'CRITICAL',
  }
}

export function generateMission(request: MissionRequest, agents: AgentProfile[]): Mission {
  const { objective } = request
  const base = objective.title || objective.description
  const capability = inferCapability(base, 'research')
  const prefix = `M-${objective.id}-${Date.now()}`
  const researchId = `${prefix}-research`
  const strategyId = `${prefix}-strategy`
  const executionId = `${prefix}-execution`
  const measurementId = `${prefix}-measurement`

  const tasks: PlannedTask[] = [
    task(researchId, `Research opportunities for ${objective.title}`, objective.id, capability, objective.priority, 'LOW'),
    task(strategyId, `Design an experiment to move ${objective.targetMetric}`, objective.id, 'experimentation', objective.priority, 'MEDIUM', [researchId]),
    task(executionId, `Execute the approved growth action for ${objective.title}`, objective.id, inferCapability(base, 'product'), objective.priority, 'MEDIUM', [strategyId]),
    task(measurementId, `Measure ${objective.targetMetric} against target ${objective.targetValue}`, objective.id, 'analytics', objective.priority, 'LOW', [executionId]),
  ]

  const assigned = tasks.map(current => {
    const compatible = agents
      .filter(agent => agent.available)
      .filter(agent => current.requiredCapabilities.every(capabilityName => agent.capabilities.includes(capabilityName)))
      .sort((a, b) => b.efficiency - a.efficiency)[0]

    return compatible ? { ...current, assignedAgentId: compatible.id } : { ...current, status: 'BLOCKED' as TaskStatus }
  })

  return {
    id: prefix,
    objectiveId: objective.id,
    title: `Mission: ${objective.title}`,
    description: `Autonomously move ${objective.targetMetric} from ${objective.currentValue} toward ${objective.targetValue}.`,
    metric: objective.targetMetric,
    targetValue: objective.targetValue,
    deadline: request.deadline ?? objective.deadline,
    budget: request.budget,
    constraints: request.constraints ?? [],
    priority: objective.priority,
    status: assigned.some(current => current.status === 'BLOCKED') ? 'BLOCKED' : 'READY',
    tasks: assigned,
    createdAt: new Date().toISOString(),
  }
}

export function missionToOperatingPlan(mission: Mission, cycle: number): OperatingPlan {
  return {
    objectiveId: mission.objectiveId,
    cycle,
    tasks: mission.tasks,
    expectedOutcome: `Move ${mission.metric} toward ${mission.targetValue}`,
    createdAt: mission.createdAt,
  }
}

export function missionProgress(mission: Mission) {
  const total = mission.tasks.length
  const completed = mission.tasks.filter(current => current.status === 'COMPLETED').length
  const failed = mission.tasks.filter(current => current.status === 'FAILED').length
  return {
    total,
    completed,
    failed,
    blocked: mission.tasks.filter(current => current.status === 'BLOCKED').length,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  }
}
