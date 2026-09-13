import { Activity, Bot, BrainCircuit, BriefcaseBusiness, ChevronRight, CircleDollarSign, Gauge, LayoutDashboard, LineChart, Network, Settings, ShieldCheck, Target, Users, WalletCards, Zap } from 'lucide-react';

const nav = [
  [LayoutDashboard, 'Overview', true], [BriefcaseBusiness, 'Company'], [Bot, 'Agents'], [Target, 'Tasks'],
  [LineChart, 'Projects'], [WalletCards, 'Finance'], [BrainCircuit, 'Strategy'], [Network, 'Memory'], [Settings, 'Settings']
] as const;

const rooms = [
  { cls: 'sales', name: 'Sales', lead: 'Revenue Engine', agents: ['AL','PR','SD'] },
  { cls: 'product', name: 'Product', lead: 'Build & Research', agents: ['DV','QA','RS'] },
  { cls: 'ops', name: 'Operations', lead: 'Execution', agents: ['OP','AU'] },
  { cls: 'finance', name: 'Finance', lead: 'Capital & Risk', agents: ['CF','AN'] },
];

const activity = [
  ['sales', 'Sales Agent', 'qualified a new enterprise lead worth €18,400', '12s'],
  ['brain', 'CEO Agent', 'approved the Q4 growth experiment', '48s'],
  ['product', 'Research Agent', 'found a pricing opportunity in the market', '2m'],
  ['finance', 'CFO Agent', 'updated runway forecast to 147 days', '4m'],
  ['ops', 'Automation Agent', 'completed onboarding workflow', '7m'],
  ['qa', 'QA Agent', 'validated release candidate v0.3', '11m'],
];

const iconMap: Record<string, typeof Activity> = { sales: Users, brain: BrainCircuit, product: Zap, finance: CircleDollarSign, ops: Gauge, qa: ShieldCheck };

export default function Home() {
  return (
    <main className="os">
      <aside className="sidebar">
        <div className="brand"><div className="brandMark">AI</div><div><div className="brandName">AI Company OS</div><div className="brandSub">AUTONOMOUS COMPANY</div></div></div>
        <nav className="nav">{nav.map(([Icon, label, active]) => <button key={label} className={active ? 'active' : ''}><Icon size={16}/><span>{label}</span></button>)}</nav>
        <div className="sideBottom"><div className="status"><i className="dot"/>System operational</div></div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div><div className="eyebrow">Company command center</div><div className="title">Good evening, CEO</div></div>
          <div className="actions"><div className="pill">Simulation · Day 37</div><button className="iconBtn"><Settings size={15}/></button></div>
        </header>

        <section className="gridStats">
          <Stat label="Cash balance" value="€18,420" trend="+€2,840 this month" />
          <Stat label="Revenue" value="€42,860" trend="+18.7% vs last month" />
          <Stat label="Active agents" value="14 / 16" trend="12 working · 2 waiting" />
          <Stat label="Open tasks" value="37" trend="9 completed today" />
          <Stat label="Company health" value="94%" trend="↑ 6% this week" />
        </section>

        <section className="dashboard">
          <div className="card floor">
            <div className="sectionHead"><div><div className="sectionTitle">Company Floor</div><div className="sectionMeta">Every room is an autonomous department</div></div><div className="pill">14 agents online</div></div>
            <div className="companyFloor">
              <div className="room ceo"><div className="roomName">Executive</div><div className="roomLead">CEO · Strategy</div><div className="agents"><Agent initials="CE" working/><Agent initials="ST"/></div></div>
              {rooms.map(r => <div className={`room ${r.cls}`} key={r.name}><div className="roomName">{r.name}</div><div className="roomLead">{r.lead}</div><div className="agents">{r.agents.map((a,i)=><Agent key={a} initials={a} working={i===0}/>)}</div></div>)}
            </div>
          </div>

          <div className="card live">
            <div className="sectionHead"><div><div className="sectionTitle">Live Activity</div><div className="sectionMeta">What the company is doing now</div></div><Activity size={16} className="muted"/></div>
            <div className="activity">{activity.map(([type, who, text, time]) => { const I=iconMap[type]; return <div className="activityItem" key={who+time}><div className="activityIcon"><I size={14}/></div><div className="activityText"><strong>{who}</strong> {text}</div><div className="time">{time}</div></div>})}</div>
          </div>
        </section>

        <section className="bottom">
          <div className="card pipeline"><div className="sectionHead"><div><div className="sectionTitle">Execution Pipeline</div><div className="sectionMeta">Work moving through the company</div></div><ChevronRight size={15} className="muted"/></div><div className="pipelineRows"><Stage name="Backlog" count="18"/><Stage name="Planning" count="7"/><Stage name="Executing" count="9"/><Stage name="Completed" count="43"/></div></div>
          <div className="card loop"><div className="sectionHead"><div><div className="sectionTitle">Autonomous Loop</div><div className="sectionMeta">The company learns and repeats</div></div><BrainCircuit size={15} className="muted"/></div><div className="loopLine"><Node label="Goal"/><Arrow/><Node label="Plan"/><Arrow/><Node label="Execute"/><Arrow/><Node label="Evaluate"/><Arrow/><Node label="Learn"/></div></div>
        </section>
        <div className="footerNote">AI Company OS · Goal → Plan → Agents → Tools → Results → Learning → New Plan</div>
      </section>
    </main>
  );
}

function Stat({label,value,trend}:{label:string,value:string,trend:string}){return <div className="card stat"><div className="statLabel">{label}</div><div className="statValue">{value}</div><div className="trend">{trend}</div></div>}
function Agent({initials,working=false}:{initials:string,working?:boolean}){return <div className={`agent ${working?'working':''}`}>{initials}</div>}
function Stage({name,count}:{name:string,count:string}){return <div className="stage"><div className="stageName">{name}</div><div className="stageCount">{count}</div></div>}
function Node({label}:{label:string}){return <div className="node"><div className="nodeCircle">●</div><div className="nodeLabel">{label}</div></div>}
function Arrow(){return <div className="arrow">→</div>}
