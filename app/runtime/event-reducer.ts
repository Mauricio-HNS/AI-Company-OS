import type { RuntimeEvent } from '../core/domain-model';

export type RuntimeProjectionState = {
  lastSequence: number;
  processedEventIds: string[];
  activeAgents: number;
  activeTasks: number;
  pendingApprovals: number;
  securityAlerts: number;
  lastEventAt?: string;
};

export type EventApplyResult = {
  accepted: boolean;
  reason: 'APPLIED' | 'DUPLICATE' | 'OUT_OF_ORDER' | 'SEQUENCE_GAP' | 'INVALID_SEQUENCE';
  state: RuntimeProjectionState;
};

const MAX_EVENT_IDS = 1000;

export const EMPTY_RUNTIME_PROJECTION: RuntimeProjectionState = {
  lastSequence: 0,
  processedEventIds: [],
  activeAgents: 0,
  activeTasks: 0,
  pendingApprovals: 0,
  securityAlerts: 0,
};

function remember(state: RuntimeProjectionState, eventId: string): string[] {
  return [...state.processedEventIds, eventId].slice(-MAX_EVENT_IDS);
}

export function applyRuntimeEvent(state: RuntimeProjectionState, event: RuntimeEvent): EventApplyResult {
  if (!event.id || !event.correlationId || event.sequence < 1) {
    return { accepted: false, reason: 'INVALID_SEQUENCE', state };
  }

  if (state.processedEventIds.includes(event.id)) {
    return { accepted: false, reason: 'DUPLICATE', state };
  }

  if (event.sequence <= state.lastSequence) {
    return { accepted: false, reason: 'OUT_OF_ORDER', state };
  }

  if (event.sequence !== state.lastSequence + 1) {
    return { accepted: false, reason: 'SEQUENCE_GAP', state };
  }

  let next = { ...state };
  switch (event.type) {
    case 'AGENT_STATE_CHANGED':
      next.activeAgents = Math.max(0, next.activeAgents + Number(event.payload.activeDelta ?? 0));
      break;
    case 'TASK_UPDATED':
      next.activeTasks = Math.max(0, next.activeTasks + Number(event.payload.activeDelta ?? 0));
      break;
    case 'APPROVAL_REQUIRED':
      next.pendingApprovals += 1;
      break;
    case 'ACTION_EXECUTED':
      next.pendingApprovals = Math.max(0, next.pendingApprovals - Number(event.payload.approvalConsumed ?? 0));
      break;
    case 'SECURITY_ALERT':
      next.securityAlerts += 1;
      break;
    default:
      break;
  }

  next.lastSequence = event.sequence;
  next.lastEventAt = event.occurredAt;
  next.processedEventIds = remember(state, event.id);
  return { accepted: true, reason: 'APPLIED', state: next };
}

export const EVENT_REDUCER_RULES = {
  SERVER_SEQUENCE_IS_AUTHORITATIVE: 'Event sequence comes from the trusted runtime, not the browser.',
  SEQUENCE_MUST_BE_CONTIGUOUS: 'A projection refuses sequence gaps until missing events are recovered.',
  DUPLICATES_ARE_IDEMPOTENT: 'The same event ID must not mutate a projection twice while retained by the projection.',
  OUT_OF_ORDER_EVENTS_ARE_NOT_APPLIED: 'A stale event cannot overwrite a newer projection state.',
  CORRELATION_IS_REQUIRED: 'Every material runtime event must be traceable to a correlation context.',
  PROJECTIONS_ARE_REBUILDABLE: 'Operational UI state is a projection and must be reconstructible from durable events.',
  PRODUCTION_REQUIRES_DURABLE_EVENT_IDEMPOTENCY: 'A production event store must durably retain event identities beyond the in-memory projection window.',
} as const;
