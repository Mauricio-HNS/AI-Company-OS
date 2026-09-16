export type ExperienceSnapshot = {
  sessions: number
  interactions: number
  views: Record<string, number>
  actions: Record<string, number>
  lastView: string
  lastAction: string
  updatedAt: string
}

const KEY = 'aicos-experience-intelligence'
const empty = (): ExperienceSnapshot => ({ sessions: 0, interactions: 0, views: {}, actions: {}, lastView: '', lastAction: '', updatedAt: new Date().toISOString() })

function read(): ExperienceSnapshot {
  if (typeof window === 'undefined') return empty()
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return empty() }
}

function write(next: ExperienceSnapshot) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('aicos:experience', { detail: next }))
}

export function trackExperience(type: 'view' | 'action', value: string) {
  const current = read()
  const next = { ...current, interactions: current.interactions + 1, updatedAt: new Date().toISOString() }
  if (type === 'view') next.views = { ...current.views, [value]: (current.views[value] || 0) + 1 }; else next.actions = { ...current.actions, [value]: (current.actions[value] || 0) + 1 }
  if (type === 'view') next.lastView = value; else next.lastAction = value
  write(next)
  return next
}

export function startExperienceSession() {
  const current = read();
  const next = { ...current, sessions: current.sessions + 1, updatedAt: new Date().toISOString() }
  write(next); return next
}

export function getExperienceSnapshot() { return read() }

export function getPreferredView(snapshot: ExperienceSnapshot) {
  const entries = Object.entries(snapshot.views).sort((a,b) => b[1] - a[1])
  return entries[0]?.[0] || 'Dashboard'
}

export function getPreferredAction(snapshot: ExperienceSnapshot) {
  const entries = Object.entries(snapshot.actions).sort((a,b) => b[1] - a[1])
  return entries[0]?.[0] || 'View missions'
}
