'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, LockKeyhole, ShieldCheck, XCircle } from 'lucide-react';
import './proposals.css';

type Proposal = { id:string; request:string; client:string; action:string; reason:string; risk:string; amount:string; created:string; expires:string; status:'PENDING'|'APPROVED'|'REJECTED' };
const seed: Proposal[] = [
  {id:'PROP-1048',request:'REQ-28491',client:'Empresa Alpha',action:'Ajustar lançamento financeiro acima do limite permitido',reason:'Corrigir divergência identificada no pagamento mensal.',risk:'MEDIUM',amount:'€ 7.850',created:'09:41',expires:'10:41',status:'PENDING'},
  {id:'PROP-1047',request:'REQ-28473',client:'Empresa Alpha',action:'Alterar regra de processamento em produção',reason:'Aplicar correção solicitada após validação em staging.',risk:'HIGH',amount:'N/A',created:'09:34',expires:'11:34',status:'PENDING'},
  {id:'PROP-1042',request:'REQ-28420',client:'Empresa Gamma',action:'Deploy de versão crítica',reason:'Correção de segurança validada pelo agente de engenharia.',risk:'HIGH',amount:'N/A',created:'08:52',expires:'09:52',status:'APPROVED'},
];

export default function CommandProposalsPage({params}:{params:{companyId:string}}){
 const pending=seed.filter(p=>p.status==='PENDING').length;
 return <main className="commandOS">
  <header className="commandTop"><div><span>CENTRAL DE COMANDO · ULTIMATE AUTHORITY</span><h1>Propostas e Autorizações</h1><p>A IA pode analisar e propor. A autoridade permanece no proprietário.</p></div><div className="commandActions"><Link href={`/company/${params.companyId}/requests`}>Central de Solicitações</Link><Link href={`/company/${params.companyId}`}>Command Center</Link></div></header>
  <section className="commandBanner"><LockKeyhole size={18}/><div><b>AUTHORITY BOUNDARY ACTIVE</b><span>Propostas não são autorizações. Toda aprovação é vinculada à ação exata, parâmetros, validade e auditoria.</span></div><strong>{pending} PENDENTES</strong></section>
  <section className="commandStats"><div><span>Pendentes</span><b>{pending}</b><small>aguardando decisão</small></div><div><span>Risco alto</span><b>{seed.filter(p=>p.risk==='HIGH'&&p.status==='PENDING').length}</b><small>requer atenção</small></div><div><span>Autorizações hoje</span><b>{seed.filter(p=>p.status==='APPROVED').length}</b><small>auditadas</small></div><div><span>Policy Engine</span><b>ACTIVE</b><small>versão 1.3</small></div></section>
  <section className="proposalList">{seed.map(p=><article className={`proposal ${p.status.toLowerCase()}`} key={p.id}>
    <div className="proposalHead"><div><b>{p.id}</b><span>{p.request} · {p.client}</span></div><strong>{p.status==='PENDING'?<Clock3 size={14}/>:p.status==='APPROVED'?<CheckCircle2 size={14}/>:<XCircle size={14}/>} {p.status}</strong></div>
    <div className="proposalBody"><div><span>AÇÃO SOLICITADA</span><h2>{p.action}</h2><p>{p.reason}</p></div><div className="proposalRisk"><span>RISCO</span><b>{p.risk}</b><span>VALOR</span><b>{p.amount}</b><span>EXPIRA</span><b>{p.expires}</b></div></div>
    <div className="proposalControls">{p.status==='PENDING'?<><button className="reject"><XCircle size={14}/> REJEITAR</button><button className="defer"><Clock3 size={14}/> DEFERIR</button><button className="approve"><ShieldCheck size={14}/> AUTORIZAR AÇÃO</button></>:<span className="audit"><FileCheck2 size={14}/> Decision audited · created {p.created}</span>}<span className="exact">Exact action binding · parameters hash required</span></div>
  </article>)}</section>
  <section className="commandRules"><h2>Regras da Central de Comando</h2><div><p><ShieldCheck size={15}/> A aprovação pertence ao proprietário, nunca ao agente.</p><p><LockKeyhole size={15}/> Um agente não pode aprovar a própria solicitação.</p><p><AlertTriangle size={15}/> Expiração, replay, parâmetros divergentes ou falha de policy bloqueiam a execução.</p></div></section>
  <footer>AI Company OS · CENTRAL DE COMANDO · AUTHORITY → POLICY → EXECUTION → AUDIT</footer>
 </main>
}
