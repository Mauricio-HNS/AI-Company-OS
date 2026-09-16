'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyReplan, initializeRuntime, recordTaskResult, startNextReadyTask, type RuntimeState } from '../../../lib/company-runtime'
import type { AgentProfile, CompanyObjective } from '../../../lib/operating-engine'
import { startExperienceSession, trackExperience } from '../../../lib/experience-intelligence'

export const runtimeAgents: AgentProfile[] = [
  { id: 'ceo', name: 'CEO Agent', capabilities: ['research', 'analytics', 'finance'], efficiency: 98, riskLimit: 'MEDIUM', available: true },
  { id: 'research', name: 'Research Agent', capabilities: ['research', 'analytics'], efficiency: 93, riskLimit: 'LOW', available: true },
  { id: 'product', name: 'Product Agent', capabilities: ['experimentation', 'product', 'analytics'], efficiency: 96, riskLimit: 'MEDIUM', available: true },
  { id: 'sales', name: 'Sales Agent', capabilities: ['experimentation', 'analytics'], efficiency: 91, riskLimit: 'MEDIUM', available: true },
  { id: 'cfo', name: 'CFO Agent', capabilities: ['finance', 'analytics'], efficiency: 97, riskLimit: 'HIGH', available: true },
]

type Company = { name: string; objective: string; revenue: string }
type RuntimeContextValue = { runtime: RuntimeState; running: boolean; setRunning: (running: boolean) => void; lastAction: string; progress: number; counts: { completed: number; executing: number; blocked: number }; advance: () => void }
const RuntimeContext = createContext<RuntimeContextValue | null>(null)

function objective(company: Company): CompanyObjective {
  const current = Number(company.revenue.replace(/[^0-9]/g, '')) || 0
  return { id: `${company.name}-objective`, title: company.objective, description: `Operate ${company.name} toward its active objective.`, priority: 10, targetMetric: 'revenue', currentValue: current, targetValue: Math.round(current * 1.2), deadline: new Date(Date.now() + 30 * 86400000).toISOString() }
}

export default function CompanyRuntimeProvider({ company, children }: { company: Company; children: ReactNode }) {
  const [running, setRunning] = useState(true)
  const [runtime, setRuntime] = useState<RuntimeState>(() => initializeRuntime(objective(company), runtimeAgents, { constraints: ['Simulation only', 'No external side effects'] }))
  const [lastAction, setLastAction] = useState('Runtime initialized')

  useEffect(() => { startExperienceSession(); trackExperience('view', `company:${company.name}`) }, [company.name])

  const advance = () => {
    setRuntime(current => {
      const executing = current.plan.tasks.find(task => task.status === 'EXECUTING')
      if (executing) {
        const action = `Completed ${executing.id}`
        setLastAction(action); trackExperience('action', action)
        return recordTaskResult(current, executing.id, true, `Deterministic result: ${executing.title}`, 92)
      }
      const ready = current.plan.tasks.find(task => task.status === 'READY')
      if (ready) {
        const action = `Started ${ready.id}`
        setLastAction(action); trackExperience('action', action)
        return startNextReadyTask(current)
      }
      if (current.replan) {
        const action = `Replan: ${current.replan.reason}`
        setLastAction(action); trackExperience('action', action)
        return applyReplan(current, runtimeAgents)
      }
      return current
    })
  }

  useEffect(() => { if (!running) return; const timer = window.setInterval(advance, 2200); return () => window.clearInterval(timer) }, [running])

  const counts = useMemo(() => ({ completed: runtime.plan.tasks.filter(task => task.status === 'COMPLETED').length, executing: runtime.plan.tasks.filter(task => task.status === 'EXECUTING').length, blocked: runtime.plan.tasks.filter(task => task.status === 'BLOCKED').length }), [runtime.plan.tasks])
  const progress = runtime.plan.tasks.length ? Math.round((counts.completed / runtime.plan.tasks.length) * 100) : 0
  const value = useMemo(() => ({ runtime, running, setRunning, lastAction, progress, counts, advance }), [runtime, running, lastAction, progress, counts])
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}

export function useCompanyRuntime() { const value = useContext(RuntimeContext); if (!value) throw new Error('useCompanyRuntime must be used inside CompanyRuntimeProvider'); return value }
