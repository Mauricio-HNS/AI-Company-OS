'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, Bot, CheckCircle2, Clock3, Play, Search, Target } from 'lucide-react';
import Link from 'next/link';
import { getCompanyTasks, summarizeOperations, TaskStatus } from '@/lib/operations-engine';
import '../company.css';
import './tasks.css';

const companies = ['alpha','beta','gamma'];
export function generateStaticParams(){return companies.map(companyId=>({companyId}));}

const columns: TaskStatus[] = ['BACKLOG','PLANNING','EXECUTING','REVIEW','COMPLETED'];
const labels: Record<TaskStatus,string> = {BACKLOG:'Backlog',PLANNING:'Planning',EXECUTING:'Executing',REVIEW:'Review',COMPLETED:'Completed'};
const priorities = ['ALL','HIGH','MEDIUM','LOW'];

export default function TasksPage({params}:{params:{companyId:string}}) {
  const {companyId}=params;
  const tasks=getCompanyTasks(companyId);
  const summary=summarizeOperations(companyId);
  const [query,setQuery]=useState('');
  const [priority,setPriority]=useState('ALL');
  const [activeColumn,setActiveColumn]=useState<TaskStatus | 'ALL'>('ALL');
  const filtered=useMemo(()=>tasks.filter(task=>{
    const q=query.trim().toLowerCase();
    const matchesQuery=!q || [task.id,task.title,task.agent,task.department].some(value=>value.toLowerCase().includes(q));
    const matchesPriority=priority==='ALL' || task.priority===priority;
    return matchesQuery && matchesPriority;
  }),[tasks,query,priority]);
  return <main className="companyOS">
    <aside className="companySide"><div className="companyBrand"><div className="companyMark">AI</div><div><b>AI Company OS</b><small>COMPANY OPERATING SYSTEM</small></div></div><Link className="portfolioBack" href={`/company/${companyId}`}><ArrowLeft size={15}/> Company Command</Link><div className="companyIdentity"><span>OPERATIONS</span><strong>{companyId.toUpperCase()}</strong><small>Task Command</small><i><em/> Simulation</i></div><nav>{['Command Center','Agents','Missions','Tasks','Products','Customers','Finance','Intelligence','Knowledge','Operations','Security','Settings'].map(x=><Link key={x} href={x==='Command Center'?`/company/${companyId}`:`/company/${companyId}/${x.toLowerCase().replace(' ','-')}`} className={x==='Tasks'?'active':''}><Target size={16}/><span>{x}</span></Link>)}</nav><div className="companySafety"><CheckCircle2 size={15}/><span>Execution guarded<br/><b>Real money OFF</b></span></div></aside>
    <section className="companyMain"><header className="companyTop"><div><span className="companyEyebrow">{companyId.toUpperCase()} / TASK COMMAND</span><h1>Execution Pipeline</h1><p>Every company objective becomes measurable, assignable work.</p></div><div className="topStatus"><span><em/> LIVE SIMULATION</span></div></header>
      <div className="companyStats"><Stat label="Backlog" value={String(summary.backlog)} detail="Waiting for planning"/><Stat label="Executing" value={String(summary.executing)} detail="Agents working now"/><Stat label="Review" value={String(summary.review)} detail="Awaiting validation"/><Stat label="Completed" value={String(summary.completed)} detail="Closed successfully"/></div>
      <section className="taskControls"><label className="taskSearch"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search tasks, agents or departments..." aria-label="Search tasks"/></label><div className="taskPriorityFilters">{priorities.map(item=><button key={item} className={priority===item?'active':''} onClick={()=>setPriority(item)}>{item}</button>)}</div><span>{filtered.length} tasks</span></section>
      <div className="taskColumnTabs"><button className={activeColumn==='ALL'?'active':''} onClick={()=>setActiveColumn('ALL')}>All columns</button>{columns.map(status=><button key={status} className={activeColumn===status?'active':''} onClick={()=>setActiveColumn(status)}>{labels[status]}</button>)}</div>
      <section className="taskBoard">{columns.filter(status=>activeColumn==='ALL'||activeColumn===status).map(status=><div className={`taskColumn ${status==='EXECUTING'?'selectedColumn':''}`} key={status}><div className="taskColumnHead"><div><span>{labels[status]}</span><b>{filtered.filter(t=>t.status===status).length}</b></div>{status==='EXECUTING'?<Play size={14}/>:status==='COMPLETED'?<CheckCircle2 size={14}/>:<Clock3 size={14}/>}</div>{filtered.filter(t=>t.status===status).map(task=><article className="taskCard" key={task.id}><div className="taskMeta"><span>{task.id}</span><b className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</b></div><h3>{task.title}</h3><div className="taskAgent"><Bot size={14}/><span>{task.agent}</span><small>{task.department}</small></div><div className="taskProgress"><i style={{width:`${task.progress}%`}}/></div><div className="taskFooter"><span>{task.progress}%</span><span>{status==='COMPLETED'?'Delivered':'In operation'}</span></div></article>)}</div>)}</section>
      {!filtered.length&&<div className="empty-state task-empty">No tasks match the current search and filters.</div>}
      <div className="simulationBanner"><Shield/><div><b>Permission-gated execution</b><span>Tasks can be planned and simulated automatically. External contracts, payments, withdrawals and real-money actions remain blocked.</span></div></div>
    </section>
  </main>;
}
function Stat({label,value,detail}:{label:string,value:string,detail:string}){return <div className="companyStat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}
function Shield(){return <Target size={17}/>}
