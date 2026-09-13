'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, Box, DollarSign, FlaskConical, Globe2, Package, Play, Sparkles, TrendingUp } from 'lucide-react';
import './products.css';

const products = [
  { id:'P-101', name:'Revenue Copilot', category:'AI SaaS', status:'LIVE', stage:'Growth', mrr:'€8,420', customers:124, conversion:'7.8%', owner:'Product Agent', health:96 },
  { id:'P-102', name:'Commerce Autopilot', category:'AI Commerce', status:'BETA', stage:'Validation', mrr:'€3,180', customers:47, conversion:'4.9%', owner:'Product Agent', health:91 },
  { id:'P-103', name:'Ops Intelligence', category:'Automation', status:'BUILDING', stage:'MVP', mrr:'€0', customers:8, conversion:'—', owner:'Product Agent', health:87 },
];

const experiments = [
  { id:'EXP-41', title:'Annual pricing vs monthly', result:'+18.4% projected MRR', status:'RUNNING', confidence:'82%' },
  { id:'EXP-42', title:'Enterprise onboarding flow', result:'-31% time-to-value', status:'WINNER', confidence:'94%' },
  { id:'EXP-43', title:'AI usage-based packaging', result:'Awaiting sample size', status:'LEARNING', confidence:'61%' },
];

export default function ProductsPage({ params }: { params: { companyId: string } }) {
  const [selectedId, setSelectedId] = useState(products[0].id);
  const [running, setRunning] = useState(false);
  const selected = useMemo(() => products.find(p => p.id === selectedId) ?? products[0], [selectedId]);

  const runExperiment = () => {
    setRunning(true);
    window.setTimeout(() => setRunning(false), 1400);
  };

  const nav = ['Command Center','Agents','Missions','Tasks','Products','Customers','Finance','Intelligence','Knowledge','Operations','Security','Settings'];

  return (
    <main className="product-command">
      <aside className="product-sidebar">
        <Link href="/portfolio" className="product-brand">AI COMPANY OS</Link>
        <div className="product-company">{params.companyId.toUpperCase()} <span>LIVE</span></div>
        <nav>{nav.map(item => { const path = item === 'Command Center' ? `/company/${params.companyId}` : `/company/${params.companyId}/${item.toLowerCase().replaceAll(' ','-')}`; return <Link key={item} className={item === 'Products' ? 'active' : ''} href={path}>{item}</Link>; })}</nav>
        <div className="product-safe"><span className="safe-dot"/> SIMULATION MODE<br/><small>External side effects blocked</small></div>
      </aside>

      <section className="product-main">
        <header className="product-header">
          <div><Link href={`/company/${params.companyId}`} className="back"><ArrowLeft size={16}/> Company Command Center</Link><div className="eyebrow">PRODUCT SYSTEM / AUTONOMOUS BUILD</div><h1>Product Command Center</h1><p>Agents discover, build, validate and scale products against measurable business outcomes.</p></div>
          <button className="primary" onClick={runExperiment}><Play size={15}/>{running ? 'Running...' : 'Run experiment'}</button>
        </header>

        <div className="product-kpis">
          <div><span><DollarSign size={15}/> MRR</span><strong>€11,600</strong><em>+24.8%</em></div>
          <div><span><UsersIcon/> Active customers</span><strong>179</strong><em>+16 this month</em></div>
          <div><span><FlaskConical size={15}/> Experiments</span><strong>12</strong><em>4 running</em></div>
          <div><span><TrendingUp size={15}/> Product health</span><strong>93%</strong><em>+3.1 pts</em></div>
        </div>

        <div className="product-grid">
          <section className="panel products-panel"><div className="panel-head"><div><span className="eyebrow">PORTFOLIO</span><h2>Products under management</h2></div><span className="count">03 ACTIVE</span></div>
            <div className="product-list">{products.map(p => <button key={p.id} className={`product-row ${selected.id === p.id ? 'selected':''}`} onClick={() => setSelectedId(p.id)}><div className="product-icon"><Box size={19}/></div><div className="product-row-main"><div><strong>{p.name}</strong><span>{p.category}</span></div><small>{p.stage} · {p.owner}</small></div><div className="product-row-metrics"><b>{p.mrr}</b><span>{p.customers} customers</span></div><div className="health"><i style={{width:`${p.health}%`}}/><small>{p.health}</small></div></button>)}</div>
          </section>

          <section className="panel product-detail"><div className="detail-top"><div className="hero-icon"><Sparkles size={25}/></div><div><span className="status">{selected.status}</span><h2>{selected.name}</h2><p>{selected.category} · {selected.stage}</p></div></div><div className="detail-stats"><div><span>MRR</span><b>{selected.mrr}</b></div><div><span>CUSTOMERS</span><b>{selected.customers}</b></div><div><span>CONVERSION</span><b>{selected.conversion}</b></div></div><div className="agent-owner"><Bot size={17}/><div><span>OPERATING AGENT</span><strong>{selected.owner}</strong></div><button onClick={runExperiment}>{running ? 'Working' : 'Assign mission'}</button></div><div className="product-loop"><div className="loop-title">AUTONOMOUS PRODUCT LOOP</div><div className="loop"><span>DISCOVER</span><i>→</i><span>BUILD</span><i>→</i><span>VALIDATE</span><i>→</i><span>GROW</span></div></div></section>
        </div>

        <section className="panel experiments"><div className="panel-head"><div><span className="eyebrow">LEARNING ENGINE</span><h2>Experiments & decisions</h2></div><span className="count">REAL-TIME</span></div><div className="experiment-list">{experiments.map(e => <div className="experiment" key={e.id}><div className="exp-mark"><FlaskConical size={16}/></div><div className="exp-main"><strong>{e.title}</strong><span>{e.id} · confidence {e.confidence}</span></div><b className={e.status.toLowerCase()}>{e.status}</b><div className="exp-result">{e.result}</div></div>)}</div></section>

        <div className="product-footer"><span><Globe2 size={14}/> Company memory connected</span><span><Package size={14}/> Product events: 2,481</span><span><Bot size={14}/> 3 product agents active</span></div>
      </section>
    </main>
  );
}

function UsersIcon(){ return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
