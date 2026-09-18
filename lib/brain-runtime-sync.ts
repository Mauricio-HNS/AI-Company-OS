import type { RuntimeState } from './company-runtime'
import type { RuntimeBrainDecision } from './brain-decision'

export type CloudBrainDecision = RuntimeBrainDecision

export type RuntimeDecisionSyncResponse = {
  companyId: string
  count: number
  decisions: CloudBrainDecision[]
  externalSideEffect: false
}

export function mergeCloudBrainDecisions(
  state: RuntimeState,
  decisions: CloudBrainDecision[],
): RuntimeState {
  const existing = new Set(state.brainDecisions.map(item => item.decisionId))
  const approved = decisions
    .filter(item => item.status === 'APPROVED')
    .filter(item => !existing.has(item.decisionId))

  if (approved.length === 0) return state

  return {
    ...state,
    brainDecisions: [...state.brainDecisions, ...approved],
  }
}

export async function pullApprovedBrainDecisions(
  baseUrl: string,
  companyId: string,
  signal?: AbortSignal,
): Promise<RuntimeDecisionSyncResponse> {
  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/bridge/v1/runtime/decisions/${encodeURIComponent(companyId)}`
  const response = await fetch(endpoint, {
    method: 'GET',
    credentials: 'omit',
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Runtime decision sync failed: HTTP ${response.status}`)
  }

  const payload = await response.json() as RuntimeDecisionSyncResponse
  if (payload.companyId !== companyId || !Array.isArray(payload.decisions)) {
    throw new Error('Runtime decision sync returned an invalid payload')
  }

  return payload
}
