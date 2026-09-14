'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Bot, Check, CircleDollarSign, Clock3, Eye, FileText, Gauge, Pause, Play, ShieldCheck, Sparkles, Target, Users, X, Zap } from 'lucide-react';
import './marketing-control.css';
import './premium-overrides.css';

type CampaignStatus='DRAFT'|'REVIEW'|'APPROVED'|'SCHEDULED'|'MEASURING';
type Campaign={id:number;name:string;channel:string;objective:string;budget:number;duration:number;audience:string;status:CampaignStatus};

const initialCampaigns:Campaign[]=[
 {id:1,name:'Café da Tarde',channel:'Instagram + Facebook',objective:'Aumentar visitas entre 16h e 19h',budget:105,duration:7,audience:'Raio de 5 km',status:'REVIEW'},
 {id:2,name:'Combo Pequeno-Almoço',channel:'Instagram Organic',objective:'Aumentar ticket médio',budget:0,duration:14,audience:'Clientes atuais',status:'SCHEDULED'},
];

export default function MarketingControl(){
 const [campaigns,setCampaigns]=useState(initialCampaigns);
 const [dailyLimit,setDailyLimit]=useState(20);
 const [monthlyLimit,setMonthlyLimit]=useState(300);
 const [spent,setSpent]=useState(246);
 const [paused,setPaused]=useState(false);
 const [selected,setSelected]=useState<Campaign|null>(null);
 const [toast,setToast]=useState('');
 const remaining=Math.max(0,monthlyLimit-spent);
 const active=campaigns.filter(c=>c.status==='REVIEW'||c.status==='APPROVED').length;
 const statusLabel=useMemo(()=>({DRAFT:'RASCUNHO',REVIEW:'AGUARDANDO APROVAÇÃO',APPROVED:'APROVADA',SCHEDULED:'AGENDADA',MEASURING:'MEDINDO'}),[]);

 function approve(id:number){
  setCampaigns(list=>list.map(c=>c.id===id?{...c,status:'APPROVED'}:c));
  setToast('Campanha aprovada. Nenhuma publicação real foi executada neste modo de demonstração.');
  setSelected(null);
 }
 function reject(id:number){setCampaigns(list=>list.filter(c=>c.id!==id));setToast('Campanha rejeitada e removida da fila.');setSelected(null)}
 function emergency(){setPaused(true);setToast('EMERGENCY STOP ativado. Todos os agentes de marketing estão pausados.')}

 return <main className="mcShell">
  <aside className="mcSide">
   <div className="mcBrand"><div>AI</div><section><b>AI COMPANY OS</b><small>MARKETING CONTROL</small></section></div>
   <Link href="/company" className="back"><ArrowLeft size={14}/> Company Command</Link>
   <div className="tenant"><span>CLIENT</span><b>Cafetería Madrid Centro</b><small>Tenant isolated · Safe Mode</small></div>
   <nav><a className="active"><Target size={15}/> Marketing Control</a><a><Bot size={15}/> Marketing Agents</a><a><ShieldCheck size={15}/> Permissions</a><a><FileText size={15}/> Audit Log</a></nav>
   <div className="sideStop"><small>GLOBAL SAFETY</small><button onClick={emergency}><Pause size={13}/> Emergency Stop</button></div>
  </aside>

  <section className="mcMain">
   <header className="mcHeader"><div><span>MARKETING / GOVERNANCE</span><h1>Marketing Control Center</h1><p>A IA pode pensar, analisar e preparar. Dinheiro e publicação permanecem sob regras explícitas.</p></div><div className="safe"><i/> SAFE MODE <small>SIMULATION</small></div></header>

   {paused&&<div className="stopBanner"><AlertTriangle size={17}/><div><b>MARKETING AGENTS PAUSED</b><small>Nenhuma ação de publicação ou gasto pode avançar.</small></div><button onClick={()=>setPaused(false)}><Play size={13}/> Retomar</button></div>}
   {toast&&<div className="toast"><Check size={14}/>{toast}<button onClick={()=>setToast('')}><X size={13}/></button></div>}

   <div className="mcContent">
    <section className="director">
      <div className="directorHead"><div className="aiIcon"><Sparkles size={20}/></div><div><span>AI MARKETING DIRECTOR</span><h2>Objetivo atual: aumentar vendas à tarde em 15%</h2></div><div className="live"><i/> WORKING</div></div>
      <div className="flow"><Flow n="01" title="Analyze" text="Sales, customers, horários" state="DONE"/><Flow n="02" title="Create" text="Copy, creative, audience" state="DONE"/><Flow n="03" title="Review" text="Budget + risk + approval" state="WAITING"/><Flow n="04" title="Execute" text="Provider API" state="LOCKED"/><Flow n="05" title="Measure" text="ROI + learning" state="LOCKED"/></div>
    </section>

    <div className="gridTop">
      <section className="panel autonomy"><div className="panelTitle"><div><span>AUTONOMY POLICY</span><h3>O que o agente pode fazer</h3></div><Gauge size={18}/></div>
       <Policy label="Analisar campanhas" mode="AUTO"/><Policy label="Criar campanhas" mode="AUTO"/><Policy label="Criar conteúdo" mode="AUTO"/><Policy label="Publicar conteúdo orgânico" mode="OPTIONAL"/><Policy label="Publicar anúncios pagos" mode="APPROVAL" locked/><Policy label="Alterar orçamento" mode="APPROVAL" locked/><Policy label="Alterar público" mode="APPROVAL" locked/>
      </section>
      <section className="panel budget"><div className="panelTitle"><div><span>BUDGET GUARDRAILS</span><h3>Limites financeiros</h3></div><CircleDollarSign size={18}/></div>
       <div className="budgetRow"><span>Daily max</span><strong>€{dailyLimit}</strong></div><input type="range" min="5" max="100" value={dailyLimit} onChange={e=>setDailyLimit(Number(e.target.value))}/>
       <div className="budgetRow"><span>Monthly max</span><strong>€{monthlyLimit}</strong></div><input type="range" min="100" max="1000" step="50" value={monthlyLimit} onChange={e=>setMonthlyLimit(Number(e.target.value))}/>
       <div className="budgetNumbers"><div><small>SPENT</small><b>€{spent}</b></div><div><small>REMAINING</small><b>€{remaining}</b></div><div><small>LIMIT</small><b>€{monthlyLimit}</b></div></div>
       <div className="meter"><i style={{width:`${Math.min(100,(spent/monthlyLimit)*100)}%`}}/></div><small className="guard">Hard stop at monthly limit · approval required above guardrail</small>
      </section>
    </div>

    <section className="panel campaigns"><div className="panelTitle"><div><span>CAMPAIGN PIPELINE</span><h3>Campanhas sob controle</h3></div><span className="count">{active} precisam de atenção</span></div>
     <div className="tableHead"><span>CAMPAIGN</span><span>CHANNEL</span><span>BUDGET</span><span>STATUS</span><span>ACTION</span></div>
     {campaigns.map(c=><div className="campaignRow" key={c.id}><div className="campaignName"><div><Target size={15}/></div><section><b>{c.name}</b><small>{c.objective}</small></section></div><span>{c.channel}</span><strong>€{c.budget}</strong><em className={c.status.toLowerCase()}>{statusLabel[c.status]}</em><button onClick={()=>setSelected(c)}><Eye size={14}/> Review</button></div>)}
    </section>

    <div className="gridBottom">
      <section className="panel approvals"><div className="panelTitle"><div><span>PENDING APPROVALS</span><h3>Você decide</h3></div><ShieldCheck size={18}/></div>
       {campaigns.filter(c=>c.status==='REVIEW').map(c=><div className="approvalMini" key={c.id}><div><b>{c.name}</b><small>Meta Ads · €{c.budget} · {c.duration} dias · {c.audience}</small></div><button onClick={()=>setSelected(c)}>Review & Approve</button></div>)}
       {campaigns.filter(c=>c.status==='REVIEW').length===0&&<div className="empty">Nenhuma campanha aguardando aprovação.</div>}
      </section>
      <section className="panel audit"><div className="panelTitle"><div><span>AUDIT LOG</span><h3>Últimas ações</h3></div><Clock3 size={18}/></div>
       <Log text="Marketing Agent criou a campanha Café da Tarde" time="há 2 min"/><Log text="AI Director calculou €105 de orçamento total" time="há 2 min"/><Log text="Audience Agent definiu raio de 5 km" time="há 3 min"/><Log text="Budget Guard bloqueou publicação automática" time="há 3 min"/>
      </section>
    </div>
   </div>
  </section>

  {selected&&<div className="modalBackdrop"><div className="reviewModal"><button className="close" onClick={()=>setSelected(null)}><X size={16}/></button><span>HUMAN APPROVAL GATE</span><h2>{selected.name}</h2><p>{selected.objective}</p><div className="reviewGrid"><Review label="CANAL" value={selected.channel}/><Review label="ORÇAMENTO" value={`€${selected.budget} total`}/><Review label="DURAÇÃO" value={`${selected.duration} dias`}/><Review label="PÚBLICO" value={selected.audience}/></div><div className="risk"><ShieldCheck size={16}/><div><b>Safety check passed</b><small>Dentro do limite mensal e sem permissão para publicar automaticamente.</small></div></div><div className="modalActions"><button onClick={()=>reject(selected.id)}>Reject</button><button className="primary" disabled={paused} onClick={()=>approve(selected.id)}><Check size={15}/> Approve campaign</button></div><small className="simulation">SIMULATION ONLY · nenhuma API externa será chamada</small></div></div>}
 </main>
}

function Flow({n,title,text,state}:{n:string;title:string;text:string;state:string}){return <div className="flowItem"><div className="flowNum">{n}</div><b>{title}</b><small>{text}</small><em className={state.toLowerCase()}>{state}</em></div>}
function Policy({label,mode,locked}:{label:string;mode:string;locked?:boolean}){return <div className="policy"><span>{label}</span><em className={mode.toLowerCase()}>{locked&&<ShieldCheck size={10}/>} {mode}</em></div>}
function Review({label,value}:{label:string;value:string}){return <div><small>{label}</small><b>{value}</b></div>}
function Log({text,time}:{text:string;time:string}){return <div className="log"><i/><div><b>{text}</b><small>{time}</small></div></div>}
