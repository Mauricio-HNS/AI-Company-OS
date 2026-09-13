'use client';

import { Building2, ChevronRight, CircleDollarSign, Cpu, Plus, TrendingUp, Activity, ShieldCheck } from 'lucide-react';
import './portfolio.css';

const companies = [
  { name: 'Company Alpha', type: 'AI SaaS Platform', revenue: '€38,420', profit: '€12,840', agents: 18, missions: 4, growth: '+18.6%', health: 94, status: 'RUNNING' },
  { name: 'Company Beta', type: 'AI Commerce', revenue: '€21,830', profit: '€7,420', agents: 11, missions: 3, growth: '+31.2%', health: 91, status: 'RUNNING' },
  { name: 'Company Gamma', type: 'AI Automation', revenue: '€4,280', profit: '€920', agents: 7, missions: 2, growth: '+42.8%', health: 87, status: 'BUILDING' },
];

export default function PortfolioPage() {
  return <main className="portfolioShell">
    <header className="portfolioTop"><div className="portfolioBrand"><span>AI</span><div><b>AI COMPANY OS</b><small>PORTFOLIO COMMAND</small></div></div><div className="portfolioUser"><span className="liveDot"/> SYSTEM ONLINE <strong>MH</strong></div></header>
    <section className="portfolioHero"><div><div className="eyebrow">OWNER / HOLDING / LIVE</div><h1>Your companies.<br/><em>One operating system.</em></h1><p>Control every autonomous company, capital allocation and strategic mission from one command center.</p></div><button className="createCompany"><Plus size={17}/> Create company</button></section>
    <section className="globalMetrics">
      <Metric icon={<CircleDollarSign/>} label="Portfolio value" value="€64,530" delta="+24.8%"/>
      <Metric icon={<TrendingUp/>} label="Total profit" value="€21,180" delta="+19.4%"/>
      <Metric icon={<Cpu/>} label="Active agents" value="36" delta="+6 this week"/>
      <Metric icon={<Activity/>} label="Active missions" value="9" delta="3 executing"/>
    </section>
    <div className="sectionHeading"><div><span>COMPANIES</span><h2>Operating portfolio</h2></div><div className="portfolioHealth"><ShieldCheck size={15}/> ALL SYSTEMS HEALTHY</div></div>
    <section className="companyGrid">{companies.map((company)=><article className="companyCard" key={company.name}>
      <div className="companyCardTop"><div className="companyIcon"><Building2 size={20}/></div><span className="companyStatus"><i/> {company.status}</span></div>
      <div className="companyTitle"><h3>{company.name}</h3><p>{company.type}</p></div>
      <div className="companyNumbers"><div><small>Revenue</small><b>{company.revenue}</b></div><div><small>Profit</small><b>{company.profit}</b></div></div>
      <div className="companyStats"><span><b>{company.agents}</b> agents</span><span><b>{company.missions}</b> missions</span><span className="growth">{company.growth}</span></div>
      <div className="health"><div><span>Company health</span><b>{company.health}%</b></div><div className="healthBar"><i style={{width:`${company.health}%`}}/></div></div>
      <button className="openCompany" onClick={()=>window.location.href='/'}>Open company <ChevronRight size={16}/></button>
    </article>)}</section>
    <section className="portfolioBottom"><div><span>GLOBAL INTELLIGENCE</span><h2>Capital is moving toward growth.</h2><p>The holding layer continuously compares company performance and identifies where resources can create the highest expected return.</p></div><div className="allocation"><div><span>RECOMMENDED ALLOCATION</span><b>€8,400</b><small>to Company Gamma</small></div><div className="allocationBar"><i/></div><p>Expected portfolio impact <strong>+7.2%</strong></p></div></section>
  </main>
}

function Metric({icon,label,value,delta}:{icon:React.ReactNode;label:string;value:string;delta:string}){return <div className="metric"><div className="metricIcon">{icon}</div><div><small>{label}</small><b>{value}</b><span>{delta}</span></div></div>}
