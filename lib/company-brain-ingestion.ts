import type { CompanyMemory } from './company-memory'
import { createMemory } from './company-memory'

export type BridgeFact = {
  key: string
  value: string | number | boolean | null
  observedAt?: string
  source?: string
  confidence?: number
}

export type BridgeIngestionEnvelope = {
  companyId: string
  kind: string
  createdAt: string
  payload: {
    facts?: BridgeFact[]
    summary?: string
    source?: string
  }
}

export type IngestionResult = {
  accepted: boolean
  reason?: string
  memories: CompanyMemory[]
  factsAccepted: number
}

const forbiddenKeys = new Set([
  'password', 'passwd', 'secret', 'token', 'access_token', 'refresh_token',
  'authorization', 'cookie', 'private_key', 'credit_card', 'card_number', 'cvv',
])

function isSafeKey(key: string): boolean {
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return normalized.length > 0 && normalized.length <= 100 && !forbiddenKeys.has(normalized)
}

function normalizeValue(value: BridgeFact['value']): BridgeFact['value'] {
  if (typeof value === 'string') return value.slice(0, 2000)
  return value
}

export function ingestBridgeEnvelope(envelope: BridgeIngestionEnvelope, now = new Date().toISOString()): IngestionResult {
  if (!envelope.companyId || envelope.companyId === 'un-enrolled') {
    return { accepted: false, reason: 'Company is not enrolled', memories: [], factsAccepted: 0 }
  }

  if (!envelope.kind || !envelope.createdAt || !envelope.payload) {
    return { accepted: false, reason: 'Invalid ingestion envelope', memories: [], factsAccepted: 0 }
  }

  const facts = (envelope.payload.facts ?? [])
    .filter(fact => isSafeKey(fact.key))
    .slice(0, 100)
    .map(fact => ({ ...fact, value: normalizeValue(fact.value) }))

  const memories: CompanyMemory[] = facts.map(fact => createMemory({
    statement: `${fact.key}: ${String(fact.value)}`,
    context: envelope.payload.summary ?? `Bridge ingestion: ${envelope.kind}`,
    source: envelope.payload.source ?? 'company-bridge',
    observedAt: fact.observedAt ?? envelope.createdAt ?? now,
    confidence: Math.max(0, Math.min(1, fact.confidence ?? 0.8)),
    evidence: [`bridge:${envelope.kind}`],
    supportingExperiments: [],
  }))

  return { accepted: true, memories, factsAccepted: facts.length }
}
