export type MemoryStatus = 'ACTIVE' | 'SUPERSEDED' | 'CONTESTED'

export type CompanyMemory = {
  id: string
  statement: string
  context: string
  source: string
  observedAt: string
  validFrom?: string
  validUntil?: string
  confidence: number
  evidence: string[]
  supportingExperiments: string[]
  status: MemoryStatus
  supersededBy?: string
}

export function createMemory(input: Omit<CompanyMemory, 'id' | 'status'> & { id?: string }): CompanyMemory {
  return { ...input, id: input.id ?? `MEM-${Date.now()}`, status: 'ACTIVE' }
}

export function supersedeMemory(memory: CompanyMemory, supersededBy: string): CompanyMemory {
  return { ...memory, status: 'SUPERSEDED', supersededBy }
}

export function contestMemory(memory: CompanyMemory): CompanyMemory {
  return { ...memory, status: 'CONTESTED' }
}

export function invalidateExpiredMemory(memory: CompanyMemory, now = Date.now()): CompanyMemory {
  if (memory.validUntil && new Date(memory.validUntil).getTime() <= now && memory.status === 'ACTIVE') return { ...memory, status: 'SUPERSEDED' }
  return memory
}
