'use client';

import Link from 'next/link';
import { use } from 'react';
import { Activity, ArrowLeft, BrainCircuit, ChevronRight, CircleDollarSign, Clock3, Cpu, ShieldCheck, Target, Wrench, Zap } from 'lucide-react';
import { getCompanyAgents, getCompanyTasks } from '@/lib/operations-engine';
import '../company.css';
import './agents.css';

const nav = ['Command Center','Agents','Missions','Tasks','Products','Customers','Finance','Intelligence','Knowledge','Operations','Security','Settings'];

export default function AgentsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params);
  const agents = getCompanyAgents(companyId);
  const tasks = getCompanyTasks(companyId);
  const [selected] = agents;
  const selectedTasks = tasks.filter(task => task.agent === selected.id);

  return (
    <main className="company-shell agents-shell">
      <aside className="company-sidebar">
        <div className="company-brand"><span className="company-brand-mark">A7</span><div><strong>AI COMPANY OS</strong><small>COMPANY COMMAND</small></div></div>
        <Link className="company-back" href="/portfolio"><ArrowLeft size={15}/> Portfolio</Link>
        <div className="company-nav">
          {nav.map(item => {
            const slug = item === 'Command Center' ? '' : `/${item.toLowerCase().replaceAll(' ', '-')}`;
            return <Link key={item} href={`/company/${companyId}${slug}`} className={item === 'Agents' ? 'active' : ''}>{item}<ChevronRight size={14}/></Link>;
          })}
        </div>
        <div className="company-safety"><ShieldCheck size={17}/><div><strong>SIMULATION MODE</strong><span>External side effects blocked</span></div></div>
      </aside>

      <section className="company-content">
        <header className="company-topbar"><div><span>COMPANY / AGENTS</span><h1>Agent Command Center</h1></div><div className="company-live"><i/> ALL SYSTEMS NOMINAL</div></header>

        <section className="agent-hero">
          <div><span className="eyebrow">AI WORKFORCE</span><h2>Agents that execute the company.</h2><p>Every agent has a role, objective, workload, performance profile and operational context.</p></div>
          <div className="agent-hero-stat"><span>ACTIVE AGENTS</span><strong>{agents.filter(a => a.status !== 'OFFLINE').length}</strong><small>of {agents.length} deployed</small></div>
        </section>

        <div className="agents-layout">
          <section className="agent-roster">
            <div className="section-heading"><div><span>WORKFORCE</span><h3>Deployed agents</h3></div><span className="section-count">{agents.length} AGENTS</span></div>
            {agents.map(agent => (
              <article key={agent.id} className={`agent-card ${agent.id === selected.id ? 'selected' : ''}`}>
                <div className="agent-avatar"><Cpu size={20}/></div>
                <div className="agent-card-main"><div className="agent-card-title"><strong>{agent.name}</strong><span className={`status status-${agent.status.toLowerCase()}`}>{agent.status}</span></div><span>{agent.role} · {agent.department}</span><p>{agent.objective}</p><div className="agent-progress"><i style={{width:`${agent.performance}%`}}/></div></div>
                <strong className="agent-score">{agent.performance}<small>PERF.</small></strong>
              </article>
            ))}
          </section>

          <aside className="agent-detail">
            <div className="detail-head"><div className="detail-avatar"><BrainCircuit size={27}/></div><div><span>SELECTED AGENT</span><h3>{selected.name}</h3><p>{selected.role}</p></div></div>
            <div className="detail-objective"><span>PRIMARY OBJECTIVE</span><strong>{selected.objective}</strong></div>
            <div className="detail-metrics"><div><Activity size={16}/><span>Performance</span><strong>{selected.performance}%</strong></div><div><Zap size={16}/><span>Status</span><strong>{selected.status}</strong></div><div><Target size={16}/><span>Tasks</span><strong>{selectedTasks.length}</strong></div></div>

            <div className="detail-section"><div className="detail-section-title"><Wrench size={15}/> Tools</div><div className="tool-list"><span>Market Intelligence</span><span>Decision Engine</span><span>Task Dispatcher</span><span>Company Memory</span></div></div>
            <div className="detail-section"><div className="detail-section-title"><Clock3 size={15}/> Current workload</div>{selectedTasks.length ? selectedTasks.map(task => <div className="mini-task" key={task.id}><span>{task.id}</span><strong>{task.title}</strong><em>{task.progress}%</em></div>) : <div className="empty-state">No active tasks assigned.</div>}</div>
            <div className="detail-section"><div className="detail-section-title"><CircleDollarSign size={15}/> Authority</div><div className="authority-row"><span>Simulation actions</span><b>ALLOWED</b></div><div className="authority-row"><span>Real-money actions</span><b className="blocked">BLOCKED</b></div></div>
          </aside>
        </div>
      </section>
    </main>
  );
}
