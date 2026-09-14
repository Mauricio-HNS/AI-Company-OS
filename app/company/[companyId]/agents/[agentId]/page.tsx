'use client';

import Link from 'next/link';
import { Activity, ArrowLeft, Bot, BrainCircuit, CheckCircle2, CircleDollarSign, Gauge, ShieldCheck, Target, Wrench } from 'lucide-react';
import { useParams } from 'next/navigation';
import '../../company.css';
import './agent-detail.css';

const agents: Record<string,{name:string;role:string;goal:string;state:string;efficiency:number;memory:number;tasks:number;completed:number;cost:string;tools:string[]}> = {
  ceo:{name:'CEO Agent',role:'Strategy & Capital',goal:'Maximize company growth within risk limits',state:'PLANNING',efficiency:98,memory:96,tasks:24,completed:21,cost:'€184',tools:['Planner','Finance','Intelligence']},
  research:{name:'Research Agent',role:'Market Intelligence',goal:'Find high-confidence market opportunities',state:'OBSERVING',efficiency:93,memory:91,tasks:31,completed:28,cost:'€142',tools:['Web Research','CRM','Knowledge']},
  product:{name:'Product Agent',role:'Build & Experiments',goal:'Turn validated opportunities into offers',state:'EXECUTING',efficiency:96,memory:94,tasks:38,completed:34,cost:'€276',tools:['Product API','Analytics','Experiment']},
  sales:{name:'Sales Agent',role:'Revenue',goal:'Increase qualified pipeline and conversion',state:'EXECUTING',efficiency:91,memory:89,tasks:42,completed:37,cost:'€318',tools:['CRM','Email','Analytics']},
  cfo:{name:'CFO Agent',role:'Finance & Risk',goal:'Protect margin and allocate capital',state:'LEARNING',efficiency:97,memory:98,tasks:19,completed:18,cost:'€121',tools:['Finance','Forecast','Risk']}
};

export default function AgentDetail(){
 const params=useParams<{companyId:string;agentId:string}>();
 const agent=agents[params.agentId]||agents.ceo;
 return <main className="companyOS"><aside className="companySide"><div className="companyBrand"><div className="companyMark">AI</div><div><b>AI Company OS</b><small>COMPANY OPERATING SYSTEM</small></div></div><Link className="portfolioBack" href={`/company/${params.companyId}`}>← <span>Company workspace</span></Link><div className="companyIdentity"><span>AI WORKFORCE</span><strong>{agent.name}</strong><small>{agent.role}</small><i><em/> {agent.state}</i></div><div className="companySafety"><ShieldCheck size={15}/><span>Controlled execution<br/><b>Simulation mode</b></span></div></aside>
 <section className="companyMain"><header className="companyTop"><div><span className="companyEyebrow">AGENT DETAIL / {agent.name.toUpperCase()}</span><h1>{agent.name}</h1><p>Role, performance, memory, execution history and operating tools.</p></div><Link href={`/company/${params.companyId}`} className="detailBack"><ArrowLeft size={15}/> Back to company</Link></header>
 <section className="agentDetailHero"><div className="agentHeroIdentity"><div className="detailIcon"><Bot size={28}/></div><div><span>{agent.role}</span><h2>{agent.goal}</h2><b><i/> {agent.state}</b></div></div><div className="detailHeroScore"><span>EFFICIENCY</span><strong>{agent.efficiency}%</strong><small>Runtime performance</small></div></section>
 <div className="detailStats"><DetailStat icon={<Gauge size={17}/>} label="Efficiency" value={`${agent.efficiency}%`} detail="Above target"/><DetailStat icon={<BrainCircuit size={17}/>} label="Memory" value={`${agent.memory}%`} detail="Knowledge synced"/><DetailStat icon={<Target size={17}/>} label="Tasks" value={String(agent.tasks)} detail={`${agent.completed} completed`}/><DetailStat icon={<CircleDollarSign size={17}/>} label="Runtime cost" value={agent.cost} detail="This cycle"/></div>
 <div className="detailGrid"><section className="detailPanel"><DetailHead icon={<Target size={16}/>} title="Current mission"/><h3>{agent.goal}</h3><p>The agent evaluates signals, executes assigned work and publishes results back into the company operating loop.</p><div className="detailProgress"><i style={{width:`${agent.efficiency}%`}}/></div><small>{agent.completed} of {agent.tasks} assigned tasks completed</small></section><section className="detailPanel"><DetailHead icon={<Wrench size={16}/>} title="Connected tools"/><div className="detailChips">{agent.tools.map(t=><span key={t}>{t}</span>)}</div><div className="detailChecklist"><CheckCircle2 size={15}/><span>Planner connected</span><CheckCircle2 size={15}/><span>Company memory synchronized</span><CheckCircle2 size={15}/><span>Execution permissions verified</span></div></section><section className="detailPanel wide"><DetailHead icon={<Activity size={16}/>} title="Recent execution history"/><div className="historyRows"><History title="Evaluated latest mission result" result="Published recommendation" time="2 min ago"/><History title="Executed assigned tool action" result="Result accepted" time="8 min ago"/><History title="Updated company memory" result="Pattern stored" time="17 min ago"/><History title="Replanned dependency" result="Queue updated" time="31 min ago"/></div></section></div>
 <footer>AI Company OS · AGENT → TASKS → TOOLS → RESULTS → MEMORY → NEXT ACTION</footer></section></main>
}
function DetailStat({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:string;detail:string}){return <div className="detailStat"><div>{icon}</div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}
function DetailHead({icon,title}:{icon:React.ReactNode;title:string}){return <div className="detailHead">{icon}<h3>{title}</h3></div>}
function History({title,result,time}:{title:string;result:string;time:string}){return <div className="historyRow"><span className="historyDot"/><div><strong>{title}</strong><small>{result}</small></div><time>{time}</time></div>}
