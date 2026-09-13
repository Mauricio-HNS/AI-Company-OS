'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Bot, CheckCircle2, ChevronRight, CircleDot, Clock3, Cpu, GitBranch, Pause, Play, ShieldCheck, Sparkles, Target, X } from 'lucide-react';
import Link from 'next/link';

const stages = [
  { id: 'strategy', label: 'CEO Strategy', agent: 'CEO Agent', detail: 'Define the highest-value path', state: 'complete' },
  { id: 'research', label: 'Market Research', agent: 'Research Agent', detail: 'Validate demand and pricing', state: 'complete' },
  { id: 'build', label: 'Build MVP', agent: 'Product Agent', detail: 'Ship the first revenue-ready version', state: 'active' },
  { id: 'growth', label: 'Growth Experiment', agent: 'Sales Agent', detail: 'Acquire the first qualified customers', state: 'pending' },
  { id: 'measure', label: 'Measure & Learn', agent: 'CFO Agent', detail: 'Evaluate profit and update strategy', state: 'pending' },
];

const initialEvents = [
  ['Product Agent', 'created pricing experiment #41', '14s'],
  ['Research Agent', 'validated 3 high-intent customer segments', '46s'],
  ['CEO Agent', 'approved MVP scope and €320 budget', '2m'],
  ['QA Agent', 'opened release validation task', '4m'],
];

export default function MissionControl() {
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState('build');
  const [events, setEvents] = useState(initialEvents);
  const active = useMemo(() => stages.find(s => s.id === selected)!, [selected]);

  function runAction() {
    setRunning(true);
    setEvents(e => [['CEO Agent', 'resumed autonomous mission execution', 'now'], ...e].slice(0, 6));
  }

  return (
    <main className="missionPage">
      <header className="missionTopbar">
        <div className="missionBrand"><div className="missionMark">AI</div><div><strong>AI Company OS</strong><span>MISSION CONTROL</span></div></div>
        <div className="missionTopActions"><span className="simBadge"><i /> Simulation · Day 37</span><Link href="/" className="backBtn"><ArrowLeft size={15}/> Command Center</Link></div>
      </header>

      <section className="missionHero">
        <div>
          <div className="missionEyebrow"><Target size={13}/> Autonomous mission</div>
          <h1>Launch a revenue-generating SaaS</h1>
          <p>CEO objective · Turn €1,000 of simulated capital into €2,000 of validated revenue.</p>
          <div className="heroActions"><button className="primaryAction" onClick={runAction}>{running ? <><Pause size={15}/> Pause mission</> : <><Play size={15}/> Resume mission</>}</button><button className="secondaryAction" onClick={() => setRunning(false)}>Stop</button></div>
        </div>
        <div className="missionScore"><div className="orbital"><div className="orbitalCore">71<span>%</span></div></div><div><small>MISSION PROGRESS</small><strong>71%</strong><span>3 of 5 stages completed</span></div></div>
      </section>

      <section className="missionGrid">
        <div className="missionCard flowCard">
          <div className="missionCardHead"><div><b>Autonomous execution graph</b><span>CEO → agents → tools → results</span></div><div className="liveLabel"><i/> LIVE</div></div>
          <div className="flow">
            {stages.map((stage, index) => <div key={stage.id} className={`flowStage ${stage.state} ${selected === stage.id ? 'selected' : ''}`} onClick={() => setSelected(stage.id)}>
              <div className="stageConnector">{index > 0 && <ChevronRight size={14}/>}</div>
              <div className="stageIcon">{stage.state === 'complete' ? <CheckCircle2 size={17}/> : stage.state === 'active' ? <Cpu size={17}/> : <CircleDot size={17}/>}</div>
              <div><strong>{stage.label}</strong><span>{stage.agent}</span><small>{stage.detail}</small></div>
              {stage.state === 'active' && <em>EXECUTING</em>}
            </div>)}
          </div>
        </div>

        <aside className="missionCard detailCard">
          <div className="missionCardHead"><div><b>Selected operation</b><span>Current execution context</span></div><Bot size={18}/></div>
          <div className="selectedAgent"><div className="agentOrb">{active.agent.slice(0,2).toUpperCase()}</div><div><strong>{active.agent}</strong><span>{active.label}</span></div></div>
          <div className="detailTitle">{active.detail}</div>
          <div className="detailRows"><div><span>State</span><b>{active.state === 'active' ? 'Executing' : active.state === 'complete' ? 'Completed' : 'Waiting'}</b></div><div><span>Authority</span><b>Simulation</b></div><div><span>Risk gate</span><b>Protected</b></div></div>
          <div className="decisionBox"><ShieldCheck size={16}/><div><strong>Permission boundary</strong><span>Real money, contracts and external side effects remain blocked.</span></div></div>
        </aside>
      </section>

      <section className="missionBottom">
        <div className="missionCard eventCard">
          <div className="missionCardHead"><div><b>Live execution stream</b><span>Agent-to-agent activity</span></div><span className="eventCount">{events.length} events</span></div>
          <div className="eventList">{events.map((event, i) => <div className="eventRow" key={`${event[0]}-${event[1]}-${i}`}><div className="eventPulse"/><div><strong>{event[0]}</strong> <span>{event[1]}</span></div><time>{event[2]}</time></div>)}</div>
        </div>
        <div className="missionCard outcomeCard">
          <div className="missionCardHead"><div><b>Mission economics</b><span>Simulated business impact</span></div><Sparkles size={18}/></div>
          <div className="economics"><div><small>CAPITAL COMMITTED</small><strong>€320</strong></div><div><small>EXPECTED REVENUE</small><strong>€2,000</strong></div><div><small>EXPECTED ROI</small><strong>+525%</strong></div></div>
          <div className="economicsBar"><i style={{ width: '71%' }}/></div>
          <div className="economicsFoot"><span><Clock3 size={13}/> 6h 42m estimated remaining</span><span><GitBranch size={13}/> 8 active dependencies</span></div>
        </div>
      </section>

      <footer className="missionFooter">SAFE SIMULATION MODE · Autonomous actions are observable, reversible and permission-gated.</footer>
    </main>
  );
}
