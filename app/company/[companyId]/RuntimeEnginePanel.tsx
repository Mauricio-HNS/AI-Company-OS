'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, CircleDot, Pause, Play, ShieldCheck, XCircle } from 'lucide-react'
import { applyReplan, initializeRuntime, recordTaskResult, startNextReadyTask, type RuntimeState } from '../../../lib/company-runtime'
import type { AgentProfile, CompanyObjective } from '../../../lib/operating-engine'

type RuntimeEnginePanelProps = {
  companyId: string
  company: {
    name: string
    objective: string
    revenue: string
  }
}

const agents: AgentProfile[] = [
  { id: 'ceo', name: 'CEO Agent', capabilities: ['research', 'analytics', 'finance'], efficiency: 98, riskLimit: 'MEDIUM', available: true },
  { id: 'research', name: 'Research Agent', capabilities: ['research', 'analytics'], efficiency: 93, riskLimit: 'LOW', available: true },
  { id: 'product', name: 'Product Agent', capabilities: ['experimentation', 'product', 'analytics'], efficiency: 96, riskLimit: 'MEDIUM', available: true },
  { id: 'sales', name: 'Sales Agent', capabilities: ['experimentation', 'analytics'], efficiency: 91, riskLimit: 'MEDIUM', available: true },
  { id: 'cfo', name: 'CFO Agent', capabilities: ['finance', 'analytics'], efficiency: 97, riskLimit: 'HIGH', available: true },
]

function createObjective(company: RuntimeEnginePanelProps['company']): CompanyObjective {
  const current = Number(company.revenue.replace(/[^0-9]/g, '')) || 0
  return {
    id: `${company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-objective`,
    title: company.objective,
    description: `Operate ${company.name} toward its current growth objective.`,
    priority: 10,
    targetMetric: 'revenue',
    currentValue: current,
    targetValue: Math.round(current * 1.2),
    deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
  }
}

export default function RuntimeEnginePanel({ companyId, company }: RuntimeEnginePanelProps) {
  const [running, setRunning] = useState(true)
  const [runtime, setRuntime] = useState<RuntimeState>(() => initializeRuntime(createObjective(company), agents, { constraints: ['Simulation only', 'No external side effects'] }))
  const [lastAction, setLastAction] = useState('Runtime initialized')

  useEffect(() => {
    if (!running) return

    const timer = window.setInterval(() => {
      setRuntime(current => {
        const executing = current.plan.tasks.find(task => task.status === 'EXECUTING')
        if (executing) {
          const next = recordTaskResult(
            current,
            executing.id,
            true,
            `Deterministic simulation result for ${executing.title}`,
            92,
          )
          setLastAction(`Completed ${executing.id}`)
          return next
        }

        const ready = current.plan.tasks.find(task => task.status === 'READY')
        if (ready) {
          setLastAction(`Started ${ready.id}`)
          return startNextReadyTask(current)
        }

        if (current.replan) {
          setLastAction(`Replan: ${current.replan.reason}`)
          return applyReplan(current, agents)
        }

        return current
      })
    }, 1800)

    return () => window.clearInterval(timer)
  }, [running])

  const completed = useMemo(() => runtime.plan.tasks.filter(task => task.status === 'COMPLETED').length, [runtime.plan.tasks])
  const executing = useMemo(() => runtime.plan.tasks.filter(task => task.status === 'EXECUTING').length, [runtime.plan.tasks])
  const blocked = useMemo(() => runtime.plan.tasks.filter(task => task.status === 'BLOCKED').length, [runtime.plan.tasks])
  const progress = runtime.plan.tasks.length ? Math.round((completed / runtime.plan.tasks.length) * 100) : 0

  return <section style={{ margin: '0 0 18px', padding: '14px 16px', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, background: 'rgba(10,12,18,.92)', color: '#fff', boxShadow: '0 12px 30px rgba(0,0,0,.18)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: 1.4, opacity: .65 }}><Activity size={13}/> PRODUCTION RUNTIME · {companyId.toUpperCase()}</div>
        <strong style={{ display: 'block', marginTop: 5, fontSize: 17 }}>{runtime.mission.title}</strong>
        <span style={{ display: 'block', marginTop: 3, fontSize: 12, opacity: .62 }}>{runtime.plan.expectedOutcome}</span>
      </div>
      <button onClick={() => setRunning(value => !value)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.05)', color: '#fff', cursor: 'pointer' }}>
        {running ? <Pause size={14}/> : <Play size={14}/>} {running ? 'Pause runtime' : 'Resume runtime'}
      </button>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginTop: 14 }}>
      <Metric label="Cycle" value={String(runtime.plan.cycle)}/>
      <Metric label="Progress" value={`${progress}%`}/>
      <Metric label="Executing" value={String(executing)}/>
      <Metric label="Blocked" value={String(blocked)}/>
    </div>

    <div style={{ marginTop: 12, height: 5, borderRadius: 5, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}><div style={{ width: `${progress}%`, height: '100%', background: 'currentColor', opacity: .8, transition: 'width .3s' }}/></div>

    <div style={{ display: 'grid', gap: 6, marginTop: 13 }}>
      {runtime.plan.tasks.map(task => <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', alignItems: 'center', gap: 8, fontSize: 12, padding: '7px 0', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        {task.status === 'COMPLETED' ? <CheckCircle2 size={14}/> : task.status === 'BLOCKED' ? <XCircle size={14}/> : task.status === 'EXECUTING' ? <Activity size={14}/> : <CircleDot size={14}/>}<span>{task.title}</span><span style={{ opacity: .62 }}>{task.status}</span>
      </div>)}
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,.06)', fontSize: 11, opacity: .7 }}>
      <span>{lastAction}</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ShieldCheck size={13}/> external actions gated</span>
    </div>
  </section>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,.045)' }}><span style={{ display: 'block', fontSize: 10, opacity: .5, textTransform: 'uppercase', letterSpacing: .8 }}>{label}</span><b style={{ display: 'block', marginTop: 2, fontSize: 14 }}>{value}</b></div>
}
