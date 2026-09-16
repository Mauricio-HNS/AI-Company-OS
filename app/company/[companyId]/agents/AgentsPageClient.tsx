'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, BrainCircuit, ChevronRight, CircleDollarSign, Clock3, Cpu, Search, ShieldCheck, Target, Wrench, Zap } from 'lucide-react';
import { getCompanyAgents, getCompanyTasks } from '@/lib/operations-engine';
import '../company.css';
import './agents.css';

const nav = ['Command Center','Agents','Missions','Tasks','Products','Customers','Finance','Intelligence','Knowledge','Operations','Security','Settings'];
const statusFilters = ['ALL','WORKING','REVIEW','WAITING'];

export default function AgentsPageClient({ companyId }: { companyId: string }) {
  const agents = getCompanyAgents(companyId);
  const tasks = getCompanyTasks(companyId);
  const [selectedId, setSelectedId] = useState(agents[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const selected = agents.find(agent => agent.id === selectedId) ?? agents[0];

  const filteredAgents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return agents.filter(agent => {
      const matchesQuery = !normalized || [agent.name, agent.role, agent.department, agent.objective].some(value => value.toLowerCase().includes(normalized));
      const matchesStatus = statusFilter === 'ALL' || agent.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [agents, query, statusFilter]);

  const selectedTasks = selected ? tasks.filter(task => task.agent === selected.id) : [];
  const activeAgents = agents.filter(a => a.status !== 'OFFLINE').length;

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
          <div className="agent-hero-stat"><span>ACTIVE AGENTS</span><strong>{activeAgents}</strong><small>of {agents.length} deployed</small></div>
        </section>

        <div className="agent-toolbar">
          <label className="agent-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search agents, roles or objectives..." aria-label="Search agents"/></label>
          <div className="agent-filters" role="group" aria-label="Agent status filter">
            {statusFilters.map(filter => <button key={filter} className={statusFilter === filter ? 'active' : ''} onClick={() => setStatusFilter(filter)}>{filter}</button>)}
          </div>
          <span className="agent-result-count">{filteredAgents.length} shown</span>
        </div>

        <div className="agents-layout">
          <section className="agent-roster">
            <div className="section-heading"><div><span>WORKFORCE</span><h3>Deployed agents</h3></div><span className="section-count">{agents.length} AGENTS</span></div>
            {filteredAgents.length ? filteredAgents.map(agent => (
              <button type="button" key={agent.id} className={`agent-card ${agent.id === selected?.id ? 'selected' : ''}`} onClick={() => setSelectedId(agent.id)} aria-pressed={agent.id === selected?.id}>
                <div className="agent-avatar"><Cpu size={20}/></div>
                <div className="agent-card-main"><div className="agent-card-title"><strong>{agent.name}</strong><span className={`status status-${agent.status.toLowerCase()}`}>{agent.status}</span></div><span>{agent.role} · {agent.department}</span><p>{agent.objective}</p><div className="agent-progress"><i style={{width:`${agent.performance}%`}}/></div></div>
                <strong className="agent-score">{agent.performance}<small>PERF.</small></strong>
              </button>
            )) : <div className="empty-state agent-empty">No agents match the current search and filter.</div>}
          </section>

          {selected ? <aside className="agent-detail">
            <div className="detail-head"><div className="detail-avatar"><BrainCircuit size={27}/></div><div><span>SELECTED AGENT</span><h3>{selected.name}</h3><p>{selected.role}</p></div></div>
            <div className="detail-objective"><span>PRIMARY OBJECTIVE</span><strong>{selected.objective}</strong></div>
            <div className="detail-metrics"><div><Activity size={16}/><span>Performance</span><strong>{selected.performance}%</strong></div><div><Zap size={16}/><span>Status</span><strong>{selected.status}</strong></div><div><Target size={16}/><span>Tasks</span><strong>{selectedTasks.length}</strong></div></div>

            <div className="detail-section"><div className="detail-section-title"><Wrench size={15}/> Tools</div><div className="tool-list"><span>Market Intelligence</span><span>Decision Engine</span><span>Task Dispatcher</span><span>Company Memory</span></div></div>
            <div className="detail-section"><div className="detail-section-title"><Clock3 size={15}/> Current workload</div>{selectedTasks.length ? selectedTasks.map(task => <div className="mini-task" key={task.id}><span>{task.id}</span><strong>{task.title}</strong><em>{task.progress}%</em></div>) : <div className="empty-state">No active tasks assigned.</div>}</div>
            <div className="detail-section"><div className="detail-section-title"><CircleDollarSign size={15}/> Authority</div><div className="authority-row"><span>Simulation actions</span><b>ALLOWED</b></div><div className="authority-row"><span>Real-money actions</span><b className="blocked">BLOCKED</b></div></div>
            <Link className="inspect-agent" href={`/company/${companyId}/agents/${selected.id}`}>Open full agent profile <ChevronRight size={14}/></Link>
          </aside> : <aside className="agent-detail"><div className="empty-state">No agent selected.</div></aside>}
        </div>
      </section>
    </main>
  );
}
