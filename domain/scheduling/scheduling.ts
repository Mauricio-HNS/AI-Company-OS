export type SchedulingResourceType = 'EMPLOYEE' | 'ROOM' | 'VEHICLE' | 'EQUIPMENT' | 'OTHER'
export type SchedulingEventType = 'APPOINTMENT' | 'RESERVATION' | 'DELIVERY' | 'VISIT' | 'SERVICE' | 'MEETING' | 'TASK'

export type SchedulingResource = { id: string; name: string; type: SchedulingResourceType; available: boolean }
export type SchedulingEvent = { id: string; companyId: string; title: string; type: SchedulingEventType; startsAt: string; endsAt: string; customer?: string; resourceIds: string[]; status: 'PLANNED' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'; source: 'HUMAN' | 'AI' | 'INTEGRATION'; linkedEntityType?: 'CUSTOMER' | 'ORDER' | 'SERVICE' | 'DELIVERY' | 'MISSION' | 'TASK'; linkedEntityId?: string; notes?: string }
export type SchedulingIntent = { title: string; type: SchedulingEventType; preferredStart: string; durationMinutes: number; customer?: string; requiredResourceTypes?: SchedulingResourceType[] }

export function hasSchedulingConflict(candidate: SchedulingEvent, existing: SchedulingEvent[]) {
  return existing.some(event => event.status !== 'CANCELLED' && event.resourceIds.some(id => candidate.resourceIds.includes(id)) && candidate.startsAt < event.endsAt && candidate.endsAt > event.startsAt)
}
