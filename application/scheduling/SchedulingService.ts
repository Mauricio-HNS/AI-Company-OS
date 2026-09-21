import type { SchedulingEvent, SchedulingIntent, SchedulingResource } from '../../domain/scheduling/scheduling'
import { hasSchedulingConflict } from '../../domain/scheduling/scheduling'

export type SchedulingProposal = { event: SchedulingEvent; conflicts: SchedulingEvent[]; availableResources: SchedulingResource[] }

export function proposeSchedule(companyId: string, intent: SchedulingIntent, resources: SchedulingResource[], existing: SchedulingEvent[]): SchedulingProposal {
  const required = intent.requiredResourceTypes ?? []
  const availableResources = resources.filter(resource => resource.available && (required.length === 0 || required.includes(resource.type)))
  const resourceIds = availableResources.slice(0, Math.max(1, required.length)).map(resource => resource.id)
  const start = new Date(intent.preferredStart)
  const end = new Date(start.getTime() + intent.durationMinutes * 60_000)
  const event: SchedulingEvent = { id: `schedule-${Date.now()}`, companyId, title: intent.title, type: intent.type, startsAt: start.toISOString(), endsAt: end.toISOString(), customer: intent.customer, resourceIds, status: 'PLANNED', source: 'AI' }
  return { event, conflicts: existing.filter(item => hasSchedulingConflict(event, [item])), availableResources }
}
