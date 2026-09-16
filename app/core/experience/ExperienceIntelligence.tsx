'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BrainCircuit, Check, Sparkles } from 'lucide-react'

export type ExperienceProfile = {
  sessionCount: number
  totalInteractions: number
  routeVisits: Record<string, number>
  actionCounts: Record<string, number>
  lastRoute: string
  density: 'comfortable' | 'compact'
  lastSeenAt: string
}

const STORAGE_KEY = 'aicos-experience-intelligence-v1'
const EVENT_NAME = 'aicos:experience-update'

const initialProfile: ExperienceProfile = {
  sessionCount: 0,
  totalInteractions: 0,
  routeVisits: {},
  actionCounts: {},
  lastRoute: '',
  density: 'comfortable',
  lastSeenAt: '',
}

function readProfile(): ExperienceProfile {
  if (typeof window === 'undefined') return initialProfile
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return { ...initialProfile, ...parsed, routeVisits: parsed?.routeVisits || {}, actionCounts: parsed?.actionCounts || {} }
  } catch {
    return initialProfile
  }
}

function saveProfile(profile: ExperienceProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: profile }))
}

export function recordExperienceEvent(type: string, value: string) {
  if (typeof window === 'undefined') return
  const profile = readProfile()
  const route = window.location.pathname
  const actionKey = `${type}:${value}`
  const next: ExperienceProfile = {
    ...profile,
    totalInteractions: profile.totalInteractions + 1,
    routeVisits: { ...profile.routeVisits, [route]: (profile.routeVisits[route] || 0) + 1 },
    actionCounts: { ...profile.actionCounts, [actionKey]: (profile.actionCounts[actionKey] || 0) + 1 },
    lastRoute: route,
    lastSeenAt: new Date().toISOString(),
  }
  saveProfile(next)
}

export function ExperienceIntelligence({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ExperienceProfile>(initialProfile)
  const [learning, setLearning] = useState(false)

  useEffect(() => {
    const existing = readProfile()
    const next = { ...existing, sessionCount: existing.sessionCount + 1, lastRoute: window.location.pathname, lastSeenAt: new Date().toISOString() }
    saveProfile(next)
    setProfile(next)

    const onUpdate = (event: Event) => {
      const custom = event as CustomEvent<ExperienceProfile>
      setProfile(custom.detail)
      setLearning(true)
      window.setTimeout(() => setLearning(false), 900)
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const actionable = target?.closest('button,a,[role="button"]') as HTMLElement | null
      if (!actionable) return
      const label = (actionable.getAttribute('aria-label') || actionable.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
      if (label) recordExperienceEvent('interaction', label)
    }

    const onRoute = () => recordExperienceEvent('route', window.location.pathname)
    window.addEventListener(EVENT_NAME, onUpdate)
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onRoute)
    return () => {
      window.removeEventListener(EVENT_NAME, onUpdate)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onRoute)
    }
  }, [])

  const learned = useMemo(() => {
    const routes = Object.entries(profile.routeVisits).sort((a, b) => b[1] - a[1])
    const actions = Object.entries(profile.actionCounts).sort((a, b) => b[1] - a[1])
    return { favoriteRoute: routes[0]?.[0] || '/', favoriteAction: actions[0]?.[0]?.split(':').slice(1).join(':') || 'Navigation' }
  }, [profile])

  useEffect(() => {
    document.documentElement.dataset.experienceDensity = profile.density
    document.documentElement.dataset.experienceLearning = learning ? 'true' : 'false'
  }, [profile.density, learning])

  return <>
    {children}
    <div className="experience-intelligence" aria-live="polite">
      <div className="experience-icon"><BrainCircuit size={15}/></div>
      <div><b>Experience Intelligence</b><span>{profile.totalInteractions > 2 ? `Learning from your workflow · ${profile.totalInteractions} interactions` : 'Learning your workflow'}</span></div>
      {learning && <Sparkles className="experience-spark" size={13}/>} 
    </div>
  </>
}

export function ExperienceStatus() {
  const [profile, setProfile] = useState<ExperienceProfile>(initialProfile)
  useEffect(() => {
    setProfile(readProfile())
    const onUpdate = (event: Event) => setProfile((event as CustomEvent<ExperienceProfile>).detail)
    window.addEventListener(EVENT_NAME, onUpdate)
    return () => window.removeEventListener(EVENT_NAME, onUpdate)
  }, [])
  return <span className="experience-status"><i/><Check size={12}/> Adaptive · {profile.totalInteractions} learned signals</span>
}
