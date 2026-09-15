'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Bot, BrainCircuit, CheckCircle2, CircleDollarSign, Gauge, LayoutDashboard, Pause, Play, Radio, Settings, ShieldCheck, Target, Users, Zap } from 'lucide-react'
import Link from 'next/link'
import { runtimeAgents, useCompanyRuntime } from './CompanyRuntimeContext'
import GuidedCommandCenter from './GuidedCommandCenter'
import type { CompanySession } from '../../../lib/company-access-control'
import { hasPermission } from '../../../lib/company-access-control'

type Company = { name: string; type: string; revenue: string; profit: string; health: string; agents: number; missions: number; objective: string }
type View = 'Command Center' | 'Agents' | 'Missions' | 'Tasks' | 'Products' | 'Customers' | 'Finance' | 'Intelligence' | 'Knowledge' | 'Operations' | 'Security' | 'Settings'

const navigation: Array<[View, typeof LayoutDashboard]> = [
  ['Command Center', LayoutDashboard], ['Agents', Bot], ['Missions', Target], ['Tasks', Zap],
  ['Products', Gauge], ['Customers', Users], ['Finance', CircleDollarSign], ['Intelligence', Activity],
  ['Knowledge', BrainCircuit], ['Operations', Radio], ['Security', ShieldCheck], ['Settings', Settings],
]

export default function CompanyRuntimeWorkspace({ company, companyId, initialView = 'Command Center' }: { company: Company; companyId: string; initialView?: View }) {
  const [view, setView] = useState<View>(initialView)
  const [session, setSession] = useState<CompanySession | null>(null)
  const { runtime, running, setRunning, lastAction, progress, counts, advance } = useCompanyRuntime()
  const assignedAgents = useMemo(() => new Map(runtimeAgents.map(agent => [agent.id, agent])), [])

  useEffect(() => {
    const stored = sessionStorage.getItem(`company-session:${companyId}`)
    if (stored) setSession(JSON.parse(stored) as CompanySession)
  }, [companyId])

  function navigate(next: View) {
    setView(next)
    history.replaceState(null, '', `?view=${encodeURIComponent(next.toLowerCase().replaceAll(' ', '-'))}`)
  }

  return (
    <main className="runtimeWorkspace">
      <aside className="runtimeSidebar">
        <div className="runtimeBrand"><div className="runtimeBrandMark">AI</div><div><strong>AI Company OS</strong><small>COMPANY OPERATING SYSTEM</small></div></div>
        <Link href="/portfolio" className="runtimeBack">← Portfolio</Link>
        <div className="runtimeIdentity"><span>COMPANY</span><strong>{company.name}</strong><small>{company.type}</small><em><i /> {session ? `${session.displayName} · ${session.role}` : 'Identity pending'}</em></div>
        <nav>{navigation.map(([label, Icon]) => <button key={label} className={view === label ? 'active' : ''} onClick={() => navigate(label)}><Icon size={15}/><span>{label}</span></button>)}</nav>
        <div className="runtimeSafety"><ShieldCheck size={15}/><span>Control layer<br/><b>Identity + permissions active</b></span></div>
      </aside>
      <section className="runtimeMain">
        <header className="runtimeHeader"><div><span>COMPANY / {view.toUpperCase()}</span><h1>{view}</h1><p>Deterministic execution, measurable outcomes and controlled autonomy.</p></div><div className="runtimeHeaderStatus"><span><i /> {session?.role ?? 'SESSION'} · CYCLE {runtime.plan.cycle}</span><button onClick={() => navigate('Settings')}><Settings size={15}/></button></div></header>
        {view === 'Command Center' && <CommandCenter company={company} runtime={runtime} running={running} setRunning={setRunning} progress={progress} counts={counts} lastAction={lastAction} advance={advance} onView={navigate} assignedAgents={assignedAgents} />}
        {view === 'Agents' && <Agents companyId={companyId} />}
        {view === 'Missions' && <Missions company={company} progress={progress} />}
        {view === 'Tasks' && <Tasks runtime={runtime} />}
        {view === 'Knowledge' && <Knowledge runtime={runtime} />}
        {view === 'Intelligence' && <Intelligence runtime={runtime} />}
        {view === 'Operations' && <Operations runtime={runtime} />}
        {view === 'Security' && <Security runtime={runtime} session={session} />}
        {view === 'Finance' && <SimpleModule title="Finance" description="Budget reservations, risk gates and financial execution remain controlled by the runtime." />}
        {view === 'Products' && <SimpleModule title="Products" description="Product execution is represented through missions, experiments and gated tasks." />}
        {view === 'Customers' && <SimpleModule title="Customers" description="Customer operations will connect to production data integrations in the integration phase." />}
        {view === 'Settings' && <SimpleModule title="Settings" description="Identity, permissions and critical approvals are controlled independently from normal execution." />}
        <footer>IDENTITY → OBJECTIVE → MISSION → PLAN → AGENTS → EXECUTION → EVALUATION → LEARNING → REPLAN</footer>
      </section>
    </main>
  )
}

function CommandCenter({ company, runtime, running, setRunning, progress, counts, lastAction, advance, onView, assignedAgents }: any) {
  const [commandNotice, setCommandNotice] = useState('')
  const phase = runtime.plan.tasks.some((task: any) => task.status === 'EXECUTING') ? 'EXECUTE' : runtime.replan ? 'REPLAN' : counts.completed === runtime.plan.tasks.length ? 'LEARN' : 'PLAN'

  function handleIntent(intent: string) {
    setCommandNotice(`Intenção recebida: “${intent}”. O runtime atual registra a intenção, mas ainda não executa ações externas.`)
  }

  return <>
    <GuidedCommandCenter objective={company.objective} expectedOutcome={runtime.plan.expectedOutcome} onSubmitIntent={handleIntent} />
    {commandNotice && <div className="runtimeNotice guidedRuntimeNotice">{commandNotice}</div>}
    <div className="runtimeStats"><Stat label="Revenue" value={company.revenue} note="Company portfolio"/><Stat label="Net profit" value={company.profit} note="Current baseline"/><Stat label="AI workforce" value={String(runtimeAgents.length)} note="Runtime agents"/><Stat label="Company health" value={company.health} note="Operating status"/></div>
    <section className="runtimeHero"><div><span>OBJECTIVE / ACTIVE MISSION</span><h2>{company.objective}</h2><p>{runtime.plan.expectedOutcome}</p><div className="runtimeProgress"><i style={{ width: `${progress}%` }}/></div><small>{progress}% complete · cycle {runtime.plan.cycle}</small></div><div className="runtimeControls"><strong>{phase}</strong><span>{running ? 'Runtime running' : 'Runtime paused'}</span><button onClick={() => setRunning(!running)}>{running ? <Pause size={14}/> : <Play size={14}/>} {running ? 'Pause' : 'Resume'}</button><button onClick={advance}>Advance cycle</button></div></section>
    <div className="runtimeGrid">
      <section className="runtimePanel"><PanelTitle title="Execution Pipeline" action="Tasks" onClick={() => onView('Tasks')}/>{runtime.plan.tasks.map((task: any) => <div className="runtimeTask" key={task.id}><StatusIcon status={task.status}/><div><strong>{task.title}</strong><small>{task.assignedAgentId ? assignedAgents.get(task.assignedAgentId)?.name : 'Unassigned'} · risk {task.risk}</small></div><b>{task.status}</b></div>)}<div className="runtimeMeta"><span>{counts.completed} completed</span><span>{counts.executing} executing</span><span>{counts.blocked} blocked</span></div></section>
      <section className="runtimePanel"><PanelTitle title="AI Workforce" action="Agents" onClick={() => onView('Agents')}/>{runtimeAgents.map(agent => <div className="runtimeAgent" key={agent.id}><div className="runtimeAvatar"><Bot size={15}/></div><div><strong>{agent.name}</strong><small>{agent.capabilities.join(' · ')}</small></div><b>{agent.efficiency}%</b></div>)}</section>
      <section className="runtimePanel runtimeWide"><PanelTitle title="Runtime Decision Log" action="Intelligence" onClick={() => onView('Intelligence')}/><div className="runtimeDecision"><CheckCircle2 size={15}/><div><strong>{lastAction}</strong><small>Execution state updated by the deterministic company runtime.</small></div></div><div className="runtimeDecision"><ShieldCheck size={15}/><div><strong>Critical actions remain protected</strong><small>Identity and permission checks are separate from normal runtime decisions.</small></div></div></section>
    </div>
  </>
}

function Agents({ companyId }: { companyId: string }) { return <Module title="AI Workforce" description="Agents are selected by capability, availability, efficiency and risk limit."><div className="runtimeCards">{runtimeAgents.map(agent => <Link href={`/company/${companyId}/agents/${agent.id}`} className="runtimeCard" key={agent.id}><div className="runtimeCardIcon"><Bot size={18}/></div><strong>{agent.name}</strong><span>{agent.capabilities.join(' · ')}</span><p>Risk limit: {agent.riskLimit}</p><b>{agent.efficiency}% efficiency</b></Link>)}</div></Module> }
function Missions({ company, progress }: { company: Company; progress: number }) { return <Module title="Active Mission" description="The mission is generated from the company objective and decomposed into executable work."><div className="missionCard"><span>CEO OBJECTIVE</span><h2>{company.objective}</h2><p>Target metric: revenue · target: +20% from baseline</p><div className="runtimeProgress"><i style={{ width: `${progress}%` }}/></div><strong>{progress}% execution progress</strong></div></Module> }
function Tasks({ runtime }: any) { return <Module title="Task Graph" description="Dependency-aware tasks move through the runtime state machine."><div className="runtimeList">{runtime.plan.tasks.map((task: any) => <div className="runtimeListRow" key={task.id}><StatusIcon status={task.status}/><div><strong>{task.id} · {task.title}</strong><small>{task.requiredCapabilities.join(', ')} · priority {task.priority} · risk {task.risk}</small></div><b>{task.status}</b></div>)}</div></Module> }
function Knowledge({ runtime }: any) { return <Module title="Company Memory" description="Learning records are evidence-backed and attached to the operating cycle."><div className="runtimeList">{runtime.learning ? <div className="runtimeListRow"><BrainCircuit size={15}/><div><strong>{runtime.learning.lesson}</strong><small>Task {runtime.learning.taskId} · score {runtime.learning.score}</small></div><b>ACTIVE</b></div> : <div className="runtimeEmpty">No learning record has been produced in this cycle yet.</div>}</div></Module> }
function Intelligence({ runtime }: any) { return <Module title="Intelligence" description="Evaluation and learning are produced from actual runtime results, not UI simulation."><div className="runtimeList"><div className="runtimeListRow"><Activity size={15}/><div><strong>Plan evaluation</strong><small>{runtime.plan.tasks.filter((t: any) => t.status === 'COMPLETED').length} completed · {runtime.plan.tasks.filter((t: any) => t.status === 'FAILED').length} failed · {runtime.plan.tasks.filter((t: any) => t.status === 'BLOCKED').length} blocked</small></div><b>{runtime.replan?.reason ?? 'CONTINUE'}</b></div>{runtime.learning && <div className="runtimeListRow"><BrainCircuit size={15}/><div><strong>{runtime.learning.lesson}</strong><small>Evidence score: {runtime.learning.score}</small></div><b>{runtime.learning.outcome}</b></div>}</div></Module> }
function Operations({ runtime }: any) { return <Module title="Operations" description="The operating loop is explicit, deterministic and dependency-aware."><div className="operationFlow">{['OBJECTIVE','MISSION','PLAN','DELEGATE','EXECUTE','OBSERVE','EVALUATE','LEARN','REPLAN'].map((step, index) => <div className={index < 5 ? 'done' : ''} key={step}><span>{String(index + 1).padStart(2, '0')}</span><b>{step}</b></div>)}</div><div className="runtimeNotice">Current cycle: {runtime.plan.cycle} · Expected outcome: {runtime.plan.expectedOutcome}</div></Module> }
function Security({ runtime, session }: { runtime: any; session: CompanySession | null }) {
  const role = session?.role ?? 'VIEWER'
  const permissions = ['VIEW_COMPANY','MONITOR_OPERATION','VIEW_FINANCE','MANAGE_STOCK','CREATE_MISSION','RUN_EXPERIMENT','CHANGE_PRICES','APPROVE_SPEND','MANAGE_USERS','EMERGENCY_STOP'] as const
  const enabled = permissions.filter(permission => hasPermission(role, permission)).length
  return <Module title="Security & Control" description="Identity, permissions and critical approvals are independent from normal execution decisions."><div className="securityGrid"><div><ShieldCheck size={18}/><strong>Signed-in identity</strong><span>{session ? `${session.displayName} · ${session.role}` : 'NOT IDENTIFIED'}</span></div><div><ShieldCheck size={18}/><strong>Permissions</strong><span>{enabled}/{permissions.length} enabled</span></div><div><ShieldCheck size={18}/><strong>Kill switch</strong><span>AVAILABLE</span></div></div><div className="runtimeNotice">Critical actions such as price changes, spending, user administration and emergency stop require an authorized role and explicit approval. Current task approval requirement: {runtime.plan.tasks.some((t: any) => t.approvalRequired) ? 'REQUIRED' : 'CLEAR'}.</div></Module>
}
function SimpleModule({ title, description }: { title: string; description: string }) { return <Module title={title} description={description}><div className="runtimeEmpty">This module is intentionally connected to the runtime before external integrations are enabled.</div></Module> }
function Module({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="runtimeModule"><div className="runtimeModuleHeader"><div><span>COMPANY OPERATIONS</span><h2>{title}</h2><p>{description}</p></div></div>{children}</section> }
function PanelTitle({ title, action, onClick }: { title: string; action: string; onClick: () => void }) { return <div className="runtimePanelTitle"><strong>{title}</strong><button onClick={onClick}>{action} →</button></div> }
function Stat({ label, value, note }: { label: string; value: string; note: string }) { return <div className="runtimeStat"><span>{label}</span><strong>{value}</strong><small>{note}</small></div> }
function StatusIcon({ status }: { status: string }) { return status === 'COMPLETED' ? <CheckCircle2 size={15}/> : status === 'EXECUTING' ? <Activity size={15}/> : status === 'BLOCKED' || status === 'FAILED' ? <ShieldCheck size={15}/> : <Radio size={15}/> }
