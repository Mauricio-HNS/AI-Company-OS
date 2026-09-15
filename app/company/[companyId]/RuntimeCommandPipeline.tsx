'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, CircleDot, Pause, Play, ShieldCheck, XCircle } from 'lucide-react'
import { applyReplan, initializeRuntime, recordTaskResult, startNextReadyTask, type RuntimeState } from '../../../lib/company-runtime'
import type { AgentProfile, CompanyObjective } from '../../../lib/operating-engine'

type Props = { company: { name: string; objective: string; revenue: string } }

const agents: AgentProfile[] = [
  { id: 'ceo', name: 'CEO Agent', capabilities: ['research', 'analytics', 'finance'], efficiency: 98, riskLimit: 'MEDIUM', available: true },
  { id: 'research', name: 'Research Agent', capabilities: ['research', 'analytics'], efficiency: 93, riskLimit: 'LOW', available: true },
  { id: 'product', name: 'Product Agent', capabilities: ['experimentation', 'product', 'analytics'], efficiency: 96, riskLimit: 'MEDIUM', available: true },
  { id: 'sales', name: 'Sales Agent', capabilities: ['experimentation', 'analytics'], efficiency: 91, riskLimit: 'MEDIUM', available: true },
  { id: 'cfo', name: 'CFO Agent', capabilities: ['finance', 'analytics'], efficiency: 97, riskLimit: 'HIGH', available: true },
]

function objective(company: Props['company']): CompanyObjective {
  const current = Number(company.revenue.replace(/[^0-9]/g, '')) || 0
  return { id: `${company.name}-objective`, title: company.objective, description: `Operate ${company.name} toward its active objective.`, priority: 10, targetMetric: 'revenue', currentValue: current, targetValue: Math.round(current * 1.2), deadline: new Date(Date.now() + 30 * 86400000).toISOString() }
}

export default function RuntimeCommandPipeline({ company }: Props) {
  const [running, setRunning] = useState(true)
  const [runtime, setRuntime] = useState<RuntimeState>(() => initializeRuntime(objective(company), agents, { constraints: ['Simulation only', 'No external side effects'] }))
  const [lastAction, setLastAction] = useState('Runtime initialized')

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      setRuntime(current => {
        const executing = current.plan.tasks.find(task => task.status === 'EXECUTING')
        if (executing) {
          setLastAction(`Completed ${executing.id}`)
          return recordTaskResult(current, executing.id, true, `Deterministic result: ${executing.title}`, 92)
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
    }, 2200)
    return () => window.clearInterval(timer)
  }, [running])

  const counts = useMemo(() => ({ completed: runtime.plan.tasks.filter(t => t.status === 'COMPLETED').length, executing: runtime.plan.tasks.filter(t => t.status === 'EXECUTING').length, blocked: runtime.plan.tasks.filter(t => t.status === 'BLOCKED').length }), [runtime.plan.tasks])
  const progress = runtime.plan.tasks.length ? Math.round((counts.completed / runtime.plan.tasks.length) * 100) : 0

  return <section style={{ marginTop: 18, padding: 16, border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, background: 'rgba(10,12,18,.9)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
      <div><span className="companyEyebrow">RUNTIME CONTROL · DETERMINISTIC</span><h3 style={{ margin: '4px 0' }}>Execution Pipeline</h3><p style={{ margin: 0, opacity: .62, fontSize: 12 }}>{runtime.plan.expectedOutcome}</p></div>
      <button onClick={() => setRunning(v => !v)}>{running ? <Pause size={14}/> : <Play size={14}/>} {running ? 'Pause' : 'Resume'}</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginTop: 12 }}>
      <Metric label="Cycle" value={String(runtime.plan.cycle)}/><Metric label="Progress" value={`${progress}%`}/><Metric label="Executing" value={String(counts.executing)}/><Metric label="Blocked" value={String(counts.blocked)}/>
    </div>
    <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 4 }}><div style={{ width: `${progress}%`, height: '100%', background: 'currentColor' }}/></div>
    <div style={{ marginTop: 10 }}>{runtime.plan.tasks.map(task => <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 8, alignItems: 'center', padding: '7px 0', borderTop: '1px solid rgba(255,255,255,.06)', fontSize: 12 }}>{task.status === 'COMPLETED' ? <CheckCircle2 size={14}/> : task.status === 'BLOCKED' ? <XCircle size={14}/> : task.status === 'EXECUTING' ? <Activity size={14}/> : <CircleDot size={14}/>}<span>{task.title}</span><b style={{ opacity: .6 }}>{task.status}</b></div>)}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', fontSize: 11, opacity: .65 }}><span>{lastAction}</span><span><ShieldCheck size={12}/> External actions gated</span></div>
  </section>
}

function Metric({ label, value }: { label: string; value: string }) { return <div style={{ padding: 8, borderRadius: 8, background: 'rgba(255,255,255,.045)' }}><span style={{ display: 'block', fontSize: 9, opacity: .5 }}>{label}</span><b>{value}</b></div> }
