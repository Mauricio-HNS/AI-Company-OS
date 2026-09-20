export type EvidenceProvenance = {
  source: string
  sourceId?: string
  observedAt: string
  confidence?: number
}

export type AuditEvent = {
  eventId: string
  tenantId: string
  companyId: string
  action: string
  actorId: string
  occurredAt: string
  provenance?: EvidenceProvenance
  metadata?: Record<string, unknown>
}
