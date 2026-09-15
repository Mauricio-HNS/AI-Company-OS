'use client'

import { Activity, CheckCircle2, CircleDot, Pause, Play, ShieldCheck, XCircle } from 'lucide-react'
import { useCompanyRuntime } from './CompanyRuntimeContext'

type Props = { company: { name: string; objective: string; revenue: string } }

export default function RuntimeCommandPipeline({ company: _company }: Props) {
  const { runtime, running, setRunning, lastAction, progress, counts } = useCompanyRuntime()

  return <section style={{ marginTop: 18, padding: 16, border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, background: 'rgba(10,12,18,.9)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
      <div><span className="companyEyebrow">RUNTIME CONTROL · DETERMINISTIC</span><h3 style={{ margin: '4px 0' }}>Execution Pipeline</h3><p style={{ margin: 0, opacity: .62, fontSize: 12 }}>{runtime.plan.expectedOutcome}</p></div>
      <button onClick={() => setRunning(!running)}>{running ? <Pause size={14}/> : <Play size={14}/>} {running ? 'Pause' : 'Resume'}</button>
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
