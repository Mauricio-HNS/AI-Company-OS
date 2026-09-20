export type PlanningTaskStatus = 'PLANNED' | 'BLOCKED' | 'READY' | 'COMPLETED' | 'FAILED'

export type PlanningTask = {
  id: string
  dependsOn?: string[]
  status: PlanningTaskStatus
}

export type PlanningGraph = {
  tasks: PlanningTask[]
}

export function createPlanningGraph(tasks: PlanningTask[]): PlanningGraph {
  return { tasks: [...tasks] }
}

export function getReadyPlanningTasks(graph: PlanningGraph): PlanningTask[] {
  const completed = new Set(graph.tasks.filter(task => task.status === 'COMPLETED').map(task => task.id))
  return graph.tasks.filter(task =>
    task.status === 'READY' ||
    (task.status === 'BLOCKED' && (task.dependsOn ?? []).every(id => completed.has(id))),
  )
}

export function validatePlanningGraph(graph: PlanningGraph): string[] {
  const ids = new Set(graph.tasks.map(task => task.id))
  const errors: string[] = []
  for (const task of graph.tasks) {
    for (const dependency of task.dependsOn ?? []) {
      if (!ids.has(dependency)) errors.push(`Task ${task.id} depends on missing task ${dependency}`)
      if (dependency === task.id) errors.push(`Task ${task.id} cannot depend on itself`)
    }
  }
  return errors
}
