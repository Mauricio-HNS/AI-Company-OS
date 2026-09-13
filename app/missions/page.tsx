'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Bot, CheckCircle2, ChevronRight, CircleDot, Clock3, Cpu, GitBranch, Pause, Play, ShieldCheck, Sparkles, Target } from 'lucide-react';
import Link from 'next/link';
import { autonomousSaaSMission, advanceMission, type CompanyMission } from '../../lib/company-engine';

const initialMission: CompanyMission = autonomousSaaSMission;

export default function MissionControl() {
  const [mission, setMission] = useState(initialMission);
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState('mvp');

  const active = useMemo(() => mission.stages.find(s => s.id === selected) ?? mission.stages.find(s => s.status === 'active')!, [mission, selected]);

  function advance() {
    setMission(current => {
      const next = advanceMission(current);
      const nextActive = next.stages.find(stage => stage.status === 'active');
      if (nextActive) setSelected(nextActive.id);
      return next;
    });
    setRunning(true);
  }

  function toggleRunning() {
    if (running) setRunning(false);
    else advance();
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
          <h1>{mission.title}</h1>
          <p>CEO objective · {mission.objective}</p>
          <div className="heroActions"><button className="primaryAction" onClick={toggleRunning}>{running ? <><Pause size={15}/> Pause mission</> : <><Play size={15}/> Advance execution</>}</button><button className="secondaryAction" onClick={() => setMission(autonomousSaaSMission)}>Reset simulation</button></div>
        </div>
        <div className="missionScore"><div className="orbital"><div className="orbitalCore">{mission.progress}<span>%</span></div></div><div><small>MISSION PROGRESS</small><strong>{mission.progress}%</strong><span>{mission.stages.filter(s => s.status === 'complete').length} of {mission.stages.length} stages completed</span></div></div>
      </section>

      <section className="missionGrid">
        <div className="missionCard flowCard">
          <div className="missionCardHead"><div><b>Autonomous execution graph</b><span>CEO → agents → tools → results</span></div><div className="liveLabel"><i/> {running ? 'LIVE' : 'PAUSED'}</div></div>
          <div className="flow">
            {mission.stages.map((stage, index) => <div key={stage.id} className={`flowStage ${stage.status} ${selected === stage.id ? 'selected' : ''}`} onClick={() => setSelected(stage.id)}>
              <div className="stageConnector">{index > 0 && <ChevronRight size={14}/>}</div>
              <div className="stageIcon">{stage.status === 'complete' ? <CheckCircle2 size={17}/> : stage.status === 'active' ? <Cpu size={17}/> : <CircleDot size={17}/>}</div>
              <div><strong>{stage.title}</strong><span>{stage.agent}</span><small>{stage.objective}</small></div>
              {stage.status === 'active' && <em>EXECUTING</em>}
            </div>)}
          </div>
        </div>

        <aside className="missionCard detailCard">
          <div className="missionCardHead"><div><b>Selected operation</b><span>Current execution context</span></div><Bot size={18}/></div>
          <div className="selectedAgent"><div className="agentOrb">{active.agent.slice(0,2).toUpperCase()}</div><div><strong>{active.agent}</strong><span>{active.title}</span></div></div>
          <div className="detailTitle">{active.objective}</div>
          <div className="detailRows"><div><span>State</span><b>{active.status === 'active' ? 'Executing' : active.status === 'complete' ? 'Completed' : 'Waiting'}</b></div><div><span>Authority</span><b>{active.authority}</b></div><div><span>Risk gate</span><b>{active.risk.toUpperCase()}</b></div></div>
          <div className="decisionBox"><ShieldCheck size={16}/><div><strong>Permission boundary</strong><span>Real money, contracts and external side effects remain blocked.</span></div></div>
        </aside>
      </section>

      <section className="missionBottom">
        <div className="missionCard eventCard">
          <div className="missionCardHead"><div><b>Live execution stream</b><span>Agent-to-agent activity</span></div><span className="eventCount">{mission.events.length} events</span></div>
          <div className="eventList">{mission.events.map((event) => <div className="eventRow" key={event.id}><div className="eventPulse"/><div><strong>{event.agent}</strong> <span>{event.message}</span></div><time>{event.time}</time></div>)}</div>
        </div>
        <div className="missionCard outcomeCard">
          <div className="missionCardHead"><div><b>Mission economics</b><span>Simulated business impact</span></div><Sparkles size={18}/></div>
          <div className="economics"><div><small>CAPITAL COMMITTED</small><strong>€{mission.capital.toLocaleString()}</strong></div><div><small>EXPECTED REVENUE</small><strong>€{mission.expectedRevenue.toLocaleString()}</strong></div><div><small>EXPECTED ROI</small><strong>+525%</strong></div></div>
          <div className="economicsBar"><i style={{ width: `${mission.progress}%` }}/></div>
          <div className="economicsFoot"><span><Clock3 size={13}/> 6h 42m estimated remaining</span><span><GitBranch size={13}/> {mission.stages.length} active stages</span></div>
        </div>
      </section>

      <footer className="missionFooter">SAFE SIMULATION MODE · Company Engine is orchestrating observable, reversible and permission-gated actions.</footer>
    </main>
  );
}
