export type ExperimentVariant = { id: string; name: string; allocation: number; observations: number[] }

export type Experiment = {
  id: string
  hypothesis: string
  successCriterion: string
  baseline: string
  metric: string
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABORTED'
  variants: ExperimentVariant[]
  startedAt?: string
  stoppedAt?: string
}

export function createExperiment(input: Omit<Experiment, 'id' | 'status'> & { id?: string }): Experiment {
  return { ...input, id: input.id ?? `EXP-${Date.now()}`, status: 'DRAFT' }
}

export function startExperiment(experiment: Experiment): Experiment {
  if (experiment.variants.length < 2) throw new Error('An experiment requires at least two variants.')
  const allocation = experiment.variants.reduce((sum, variant) => sum + variant.allocation, 0)
  if (allocation !== 100) throw new Error('Variant allocation must total 100%.')
  return { ...experiment, status: 'RUNNING', startedAt: new Date().toISOString() }
}

export function stopExperiment(experiment: Experiment, status: 'COMPLETED' | 'ABORTED' = 'COMPLETED'): Experiment {
  return { ...experiment, status, stoppedAt: new Date().toISOString() }
}
