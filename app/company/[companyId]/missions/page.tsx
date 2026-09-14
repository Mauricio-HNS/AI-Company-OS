'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, BrainCircuit, CheckCircle2, CircleDollarSign, Gauge, Pause, Play, RotateCcw, ShieldCheck, Target, Zap } from 'lucide-react';
import { autonomousSaaSMission, advanceMission, CompanyMission } from '../../../../lib/company-engine';
import './missions.css';

const nav = ['Command Center','Agents','Missions','Tasks','Products','Customers','Finance','Intelligence','Knowledge','Operations','Security','Settings'];

export default function MissionsPage({ params }: { params: { companyId: string } }) {
  const companyId = params.companyId;
  const [mission, setMission] = useState<CompanyMission>(structuredClone(autonomousSaaSMission));
  const [selectedStage, setSelectedStage] = useState(mission.stages.find((s) => s.status === 'active')?.id ?? mission.stages[0].id);
  const [running, setRunning] = useState(true);

  const stage = mission.stages.find((item) => item.id === selectedStage) ?? mission.stages[0];
  const completed = mission.stages.filter((item) => item.status === 'complete').length;

  function advance() {
    setMission((current) => advanceMission(current));
    const next = mission.stages.findIndex((item) => item.status === 'active');
    if (next >= 0 && mission.stages[next + 1]) setSelectedStage(mission.stages[next + 1].id);
  }

  function reset() {
    setMission(structuredClone(autonomousSaaSMission));
    setSelectedStage('mvp');
    setRunning(true);
  }

  return (
    <main className="mission-shell">
      <header className="mission-topbar">
        <Link href="/portfolio" className="brand"><span>AI COMPANY OS</span><small>MISSION COMMAND</small></Link>
        <div className="mission-status"><span className="status-dot" /> SIMULATION ONLINE</div>
        <Link href={`/company/${companyId}`} className="back-company"><ArrowLeft size={16} /> Company</Link>
      </header>

      <div className="mission-layout">
        <aside className="mission-sidebar">
          <div className="side-label">COMPANY OPERATIONS</div>
          {nav.map((item) => {
            const active = item === 'Missions';
            const href = item === 'Command Center' ? `/company/${companyId}` : `/company/${companyId}/${item.toLowerCase().replaceAll(' ', '-')}`;
            return <Link key={item} href={href} className={`side-link ${active ? 'active' : ''}`}><span>{item}</span>{active && <span className="active-mark" />}</Link>;
          })}
          <div className="safety-card"><ShieldCheck size={18}/><div><strong>Safe Simulation</strong><p>External side effects, contracts, payments and real-money actions are blocked.</p></div></div>
        </aside>

        <section className="mission-content">
          <div className="mission-heading">
            <div><div className="eyebrow">AUTONOMOUS MISSION / {mission.id.toUpperCase()}</div><h1>Mission Command Center</h1><p>One objective moving through the complete autonomous operating loop.</p></div>
            <div className="mission-controls"><button onClick={() => setRunning((v) => !v)}>{running ? <Pause size={15}/> : <Play size={15}/>} {running ? 'Pause' : 'Resume'}</button><button onClick={advance} className="primary"><Zap size={15}/> Advance Simulation</button><button onClick={reset} title="Reset mission"><RotateCcw size={15}/></button></div>
          </div>

          <section className="mission-hero">
            <div className="hero-main"><div className="mission-kicker"><Target size={15}/> ACTIVE OBJECTIVE</div><h2>{mission.title}</h2><p>{mission.objective}</p><div className="hero-progress"><div className="progress-track"><span style={{width:`${mission.progress}%`}} /></div><strong>{mission.progress}%</strong></div></div>
            <div className="hero-metrics"><div><span>CAPITAL</span><strong>€{mission.capital.toLocaleString()}</strong><small>simulated remaining</small></div><div><span>EXPECTED REVENUE</span><strong>€{mission.expectedRevenue.toLocaleString()}</strong><small>validated target</small></div><div><span>STAGES</span><strong>{completed}/{mission.stages.length}</strong><small>completed</small></div></div>
          </section>

          <div className="loop-strip"><span>GOAL</span><b>→</b><span>PLAN</span><b>→</b><span>TASKS</span><b>→</b><span>AGENTS</span><b>→</b><span className="current">EXECUTION</span><b>→</b><span>EVALUATION</span><b>→</b><span>LEARNING</span></div>

          <div className="mission-grid">
            <section className="panel pipeline-panel"><div className="panel-head"><div><span className="panel-label">MISSION PIPELINE</span><h3>Execution stages</h3></div><span className="live-pill"><Activity size={13}/> LIVE</span></div><div className="stage-list">{mission.stages.map((item,index) => <button key={item.id} onClick={() => setSelectedStage(item.id)} className={`stage ${item.status} ${selectedStage === item.id ? 'selected' : ''}`}><div className="stage-index">{item.status === 'complete' ? <CheckCircle2 size={18}/> : <span>{String(index+1).padStart(2,'0')}</span>}</div><div className="stage-copy"><strong>{item.title}</strong><span>{item.agent}</span></div><div className="stage-progress"><span>{item.progress}%</span><div><i style={{width:`${item.progress}%`}}/></div></div><div className={`risk ${item.risk}`}>{item.risk}</div></button>)}</div></section>

            <section className="panel detail-panel"><div className="panel-head"><div><span className="panel-label">SELECTED STAGE</span><h3>{stage.title}</h3></div><span className={`stage-badge ${stage.status}`}>{stage.status}</span></div><div className="detail-agent"><div className="agent-orb"><BrainCircuit size={24}/></div><div><span>RESPONSIBLE AGENT</span><strong>{stage.agent}</strong></div></div><div className="detail-block"><span>OBJECTIVE</span><p>{stage.objective}</p></div><div className="detail-block"><span>AUTHORITY</span><p>{stage.authority}</p></div><div className="detail-meta"><div><span>RISK</span><strong className={stage.risk}>{stage.risk.toUpperCase()}</strong></div><div><span>PROGRESS</span><strong>{stage.progress}%</strong></div></div><div className="authority-box"><ShieldCheck size={16}/><span>Simulation authority only. Real-world execution remains locked.</span></div></section>
          </div>

          <section className="panel events-panel"><div className="panel-head"><div><span className="panel-label">MISSION MEMORY</span><h3>Live execution events</h3></div><span className="event-count">{mission.events.length} EVENTS</span></div><div className="events">{mission.events.map((event) => <div className="event" key={event.id}><div className={`event-icon ${event.type}`}><Activity size={14}/></div><span className="event-time">{event.time}</span><div><strong>{event.agent}</strong><p>{event.message}</p></div></div>)}</div></section>
        </section>
      </div>
    </main>
  );
}
