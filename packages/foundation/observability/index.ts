export type CorrelationContext = {
  correlationId: string
  causationId?: string
}

export function createCorrelationContext(correlationId: string, causationId?: string): CorrelationContext {
  if (!correlationId.trim()) throw new Error('correlationId is required')
  return { correlationId, causationId }
}
