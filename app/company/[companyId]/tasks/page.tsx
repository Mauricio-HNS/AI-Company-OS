import { ArrowLeft, Bot, CheckCircle2, Clock3, Play, Target } from 'lucide-react';
import Link from 'next/link';
import { getCompanyTasks, summarizeOperations, TaskStatus } from '@/lib/operations-engine';
import '../company.css';

const companies = ['alpha','beta','gamma'];
export function generateStaticParams(){return companies.map(companyId=>({companyId}));}

const columns: TaskStatus[] = ['BACKLOG','PLANNING','EXECUTING','REVIEW','COMPLETED'];
const labels: Record<TaskStatus,string> = {BACKLOG:'Backlog',PLANNING:'Planning',EXECUTING:'Executing',REVIEW:'Review',COMPLETED:'Completed'};

export default function TasksPage({params}:{params:{companyId:string}}) {
  const {companyId}=params;
  const tasks=getCompanyTasks(companyId);
  const summary=summarizeOperations(companyId);
  return <main className="companyOS">
    <aside className="companySide"><div className="companyBrand"><div className="companyMark">AI</div><div><b>AI Company OS</b><small>COMPANY OPERATING SYSTEM</small></div></div><Link className="portfolioBack" href={`/company/${companyId}`}><ArrowLeft size={15}/> Company Command</Link><div className="companyIdentity"><span>OPERATIONS</span><strong>{companyId.toUpperCase()}</strong><small>Task Command</small><i><em/> Simulation</i></div><nav>{['Command Center','Agents','Missions','Tasks','Products','Customers','Finance','Intelligence','Knowledge','Operations','Security','Settings'].map(x=><Link key={x} href={x==='Command Center'?`/company/${companyId}`:`/company/${companyId}/${x.toLowerCase().replace(' ','-')}`} className={x==='Tasks'?'active':''}><Target size={16}/><span>{x}</span></Link>)}</nav><div className="companySafety"><CheckCircle2 size={15}/><span>Execution guarded<br/><b>Real money OFF</b></span></div></aside>
    <section className="companyMain"><header className="companyTop"><div><span className="companyEyebrow">{companyId.toUpperCase()} / TASK COMMAND</span><h1>Execution Pipeline</h1><p>Every company objective becomes measurable, assignable work.</p></div><div className="topStatus"><span><em/> LIVE SIMULATION</span></div></header>
      <div className="companyStats"><Stat label="Backlog" value={String(summary.backlog)} detail="Waiting for planning"/><Stat label="Executing" value={String(summary.executing)} detail="Agents working now"/><Stat label="Review" value={String(summary.review)} detail="Awaiting validation"/><Stat label="Completed" value={String(summary.completed)} detail="Closed successfully"/></div>
      <section className="taskBoard">{columns.map(status=><div className={`taskColumn ${status==='EXECUTING'?'selectedColumn':''}`} key={status}><div className="taskColumnHead"><div><span>{labels[status]}</span><b>{tasks.filter(t=>t.status===status).length}</b></div>{status==='EXECUTING'?<Play size={14}/>:status==='COMPLETED'?<CheckCircle2 size={14}/>:<Clock3 size={14}/>}</div>{tasks.filter(t=>t.status===status).map(task=><article className="taskCard" key={task.id}><div className="taskMeta"><span>{task.id}</span><b className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</b></div><h3>{task.title}</h3><div className="taskAgent"><Bot size={14}/><span>{task.agent}</span><small>{task.department}</small></div><div className="taskProgress"><i style={{width:`${task.progress}%`}}/></div><div className="taskFooter"><span>{task.progress}%</span><span>{status==='COMPLETED'?'Delivered':'In operation'}</span></div></article>)}</div>)}</section>
      <div className="simulationBanner"><Shield/><div><b>Permission-gated execution</b><span>Tasks can be planned and simulated automatically. External contracts, payments, withdrawals and real-money actions remain blocked.</span></div></div>
    </section>
  </main>;
}
function Stat({label,value,detail}:{label:string,value:string,detail:string}){return <div className="companyStat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}
function Shield(){return <Target size={17}/>}
