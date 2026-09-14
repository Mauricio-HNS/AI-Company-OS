'use client';

import { ArrowLeft, Bot, BrainCircuit, ChartNoAxesCombined, CircleDollarSign, Gauge, LayoutDashboard, Network, Settings, ShieldCheck, Target, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import './company.css';

const companies: Record<string, {name:string; type:string; revenue:string; profit:string; health:string; agents:number; missions:number; objective:string}> = {
  alpha: {name:'Company Alpha', type:'AI SaaS Platform', revenue:'€38,420', profit:'€12,840', health:'94%', agents:18, missions:4, objective:'Launch the next recurring-revenue product'},
  beta: {name:'Company Beta', type:'AI Commerce', revenue:'€21,830', profit:'€7,420', health:'91%', agents:11, missions:3, objective:'Increase conversion and customer lifetime value'},
  gamma: {name:'Company Gamma', type:'AI Automation', revenue:'€4,280', profit:'€920', health:'87%', agents:7, missions:2, objective:'Validate the first enterprise automation offer'},
};

export function generateStaticParams() { return Object.keys(companies).map(companyId => ({ companyId })); }

const nav = [[LayoutDashboard,'Command Center'],[Bot,'Agents'],[Target,'Missions'],[Zap,'Tasks'],[Gauge,'Products'],[Users,'Customers'],[CircleDollarSign,'Finance'],[ChartNoAxesCombined,'Intelligence'],[BrainCircuit,'Knowledge'],[Network,'Operations'],[ShieldCheck,'Security'],[Settings,'Settings']] as const;

export default function CompanyPage({params}:{params:{companyId:string}}) {
  const company = companies[params.companyId] ?? companies.alpha;
  return <main className="companyOS">
    <aside className="companySide">
      <div className="companyBrand"><div className="companyMark">AI</div><div><b>AI Company OS</b><small>COMPANY OPERATING SYSTEM</small></div></div>
      <Link className="portfolioBack" href="/portfolio"><ArrowLeft size={15}/> Portfolio</Link>
      <div className="companyIdentity"><span>COMPANY</span><strong>{company.name}</strong><small>{company.type}</small><i><em/> Operational</i></div>
      <nav>{nav.map(([Icon,label])=><button key={label} className={label==='Command Center'?'active':''}><Icon size={16}/><span>{label}</span></button>)}</nav>
      <div className="companySafety"><ShieldCheck size={15}/><span>Simulation mode<br/><b>Real money OFF</b></span></div>
    </aside>
    <section className="companyMain">
      <header className="companyTop"><div><span className="companyEyebrow">{company.name} / COMMAND CENTER</span><h1>Company Command Center</h1><p>Autonomous operations, measurable growth and controlled execution.</p></div><div className="topStatus"><span><em/> LIVE</span><button><Settings size={15}/></button></div></header>
      <div className="companyStats"><Stat label="Revenue" value={company.revenue} detail="+18.6% this cycle"/><Stat label="Net profit" value={company.profit} detail="+12.4% this cycle"/><Stat label="AI workforce" value={String(company.agents)} detail="Agents operating"/><Stat label="Company health" value={company.health} detail="Stable · low risk"/></div>
      <section className="missionHero"><div><span className="companyEyebrow">CEO OBJECTIVE · ACTIVE MISSION</span><h2>{company.objective}</h2><p>CEO → Research → Product → Sales → CFO</p><div className="missionProgress"><i style={{width:'71%'}}/></div><small>71% complete · 6 active dependencies</small></div><div className="missionOrb"><b>71%</b><span>MISSION</span></div></section>
      <div className="companyGrid">
        <section className="panel"><PanelHead title="AI Workforce" action="View all agents"/><div className="agentRows"><Agent name="CEO Agent" role="Strategy & Capital" state="Deciding next allocation" score="98%"/><Agent name="Research Agent" role="Market Intelligence" state="Validating customer segments" score="93%"/><Agent name="Product Agent" role="Build & Experiments" state="Building MVP release" score="96%"/><Agent name="Sales Agent" role="Revenue" state="Preparing growth experiment" score="91%"/></div></section>
        <section className="panel"><PanelHead title="Execution Pipeline" action="Open tasks"/><div className="pipeline"><Pipe label="Backlog" value="18"/><Pipe label="Planning" value="7"/><Pipe label="Executing" value="9" active/><Pipe label="Completed" value="43"/></div></section>
        <section className="panel wide"><PanelHead title="Live Company Activity" action="Live"/><div className="activity"><Activity text="Product Agent created pricing experiment #41" time="12s"/><Activity text="Research Agent validated 3 high-intent segments" time="48s"/><Activity text="CEO Agent approved MVP scope and €320 budget" time="2m"/><Activity text="QA Agent opened release validation task" time="4m"/></div></section>
      </div>
      <footer>AI Company OS · GOAL → MISSION → TASKS → AGENTS → TOOLS → RESULTS → LEARNING → NEXT PLAN</footer>
    </section>
  </main>;
}
function Stat({label,value,detail}:{label:string,value:string,detail:string}){return <div className="companyStat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}
function PanelHead({title,action}:{title:string,action:string}){return <div className="panelHead"><div><b>{title}</b><span>Autonomous company operations</span></div><button>{action} →</button></div>}
function Agent({name,role,state,score}:{name:string;role:string;state:string;score:string}){return <div className="agentRow"><div className="agentIcon"><Bot size={16}/></div><div><b>{name}</b><small>{role}</small><span>{state}</span></div><strong>{score}</strong></div>}
function Pipe({label,value,active}:{label:string;value:string;active?:boolean}){return <div className={active?'pipe activePipe':'pipe'}><span>{label}</span><b>{value}</b><i><em style={{width:`${Math.min(Number(value)*2,100)}%`}}/></i></div>}
function Activity({text,time}:{text:string;time:string}){return <div className="activityRow"><i/><div><b>{text}</b><small>{time}</small></div></div>}
