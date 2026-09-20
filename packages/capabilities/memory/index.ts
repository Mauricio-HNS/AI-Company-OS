export type MemoryStatus = 'ACTIVE' | 'SUPERSEDED' | 'CONTESTED'

export type MemoryRecord = {
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

export function createMemory(input: Omit<MemoryRecord, 'id' | 'status'> & { id?: string }): MemoryRecord {
  return { ...input, id: input.id ?? `MEM-${Date.now()}`, status: 'ACTIVE' }
}

export function supersedeMemory(memory: MemoryRecord, supersededBy: string): MemoryRecord {
  return { ...memory, status: 'SUPERSEDED', supersededBy }
}

export function contestMemory(memory: MemoryRecord): MemoryRecord {
  return { ...memory, status: 'CONTESTED' }
}

export function invalidateExpiredMemory(memory: MemoryRecord, now = Date.now()): MemoryRecord {
  if (memory.validUntil && new Date(memory.validUntil).getTime() <= now && memory.status === 'ACTIVE') {
    return { ...memory, status: 'SUPERSEDED' }
  }
  return memory
}
