'use client';

import Link from 'next/link';
import { Activity, ArrowUpRight, Building2, CircleDollarSign, Gauge, Plus, ShieldCheck, Users, Zap } from 'lucide-react';
import './master.css';

const companies = [
  { id: 'alpha', name: 'Company Alpha', type: 'AI SaaS Platform', revenue: '€38,420', profit: '€12,840', health: 94, agents: 18, missions: 4, status: 'Operational', objective: 'Launch the next recurring-revenue product' },
  { id: 'beta', name: 'Company Beta', type: 'AI Commerce', revenue: '€21,830', profit: '€7,420', health: 91, agents: 11, missions: 3, status: 'Operational', objective: 'Increase conversion and customer lifetime value' },
  { id: 'gamma', name: 'Company Gamma', type: 'AI Automation', revenue: '€4,280', profit: '€920', health: 87, agents: 7, missions: 2, status: 'Building', objective: 'Validate the first enterprise automation offer' },
];

const activity = [
  ['Company Alpha', 'closed an enterprise opportunity', '€18,400', '2m'],
  ['Company Beta', 'launched a conversion experiment', '+8.4%', '11m'],
  ['Company Gamma', 'completed an automation prototype', 'Ready', '24m'],
  ['Portfolio OS', 'rebalanced simulated capital allocation', '€64,530', '41m'],
] as const;

export default function MasterPage() {
  const totalRevenue = '€64,530';
  const totalProfit = '€21,180';
  const totalAgents = companies.reduce((n, c) => n + c.agents, 0);
  const avgHealth = Math.round(companies.reduce((n, c) => n + c.health, 0) / companies.length);

  return (
    <main className="masterShell">
      <aside className="masterSidebar">
        <div className="masterBrand"><div className="masterLogo">AI</div><div><strong>AI Company OS</strong><span>MASTER CONTROL</span></div></div>
        <div className="masterNav">
          <button className="masterNavItem active"><Gauge size={17} />Portfolio Overview</button>
          <button className="masterNavItem"><Building2 size={17} />Companies</button>
          <button className="masterNavItem"><Users size={17} />AI Workforce</button>
          <button className="masterNavItem"><CircleDollarSign size={17} />Capital</button>
          <button className="masterNavItem"><ShieldCheck size={17} />Risk & Policies</button>
        </div>
        <div className="masterSidebarBottom"><div className="masterSystem"><i />All systems operational</div><Link href="/" className="backLink">← Company OS</Link></div>
      </aside>

      <section className="masterMain">
        <header className="masterHeader">
          <div><div className="masterEyebrow">Master command center</div><h1>Company Portfolio</h1><p>One control layer for every autonomous company you operate.</p></div>
          <div className="masterHeaderActions"><span className="simulationPill"><i />Simulation mode</span><button className="masterAction"><Plus size={16} />New company</button></div>
        </header>

        <section className="portfolioStats">
          <Stat icon={<CircleDollarSign size={18} />} label="Portfolio revenue" value={totalRevenue} detail="+17.2% this cycle" />
          <Stat icon={<Zap size={18} />} label="Portfolio profit" value={totalProfit} detail="+€4,180 this cycle" />
          <Stat icon={<Users size={18} />} label="AI workforce" value={`${totalAgents} agents`} detail="Across 3 companies" />
          <Stat icon={<Activity size={18} />} label="Portfolio health" value={`${avgHealth}%`} detail="No critical alerts" />
        </section>

        <div className="masterSectionHead"><div><h2>Your companies</h2><span>Each company has its own autonomous workspace and dashboard.</span></div><span className="companyCount">{companies.length} active</span></div>

        <section className="companyGrid">
          {companies.map(company => (
            <Link href={`/company/${company.id}`} className="masterCompanyCard companyCardLink" key={company.id} aria-label={`Open details for ${company.name}`}>
              <div className="companyCardTop"><div className="companyIdentity"><div className="companyLogo">{company.name.split(' ').pop()?.[0]}</div><div><h3>{company.name}</h3><span>{company.type}</span></div></div><span className={company.status === 'Operational' ? 'statusBadge' : 'statusBadge building'}><i />{company.status}</span></div>
              <div className="companyObjective"><small>Current objective</small><strong>{company.objective}</strong></div>
              <div className="companyMetrics"><Metric label="Revenue" value={company.revenue} /><Metric label="Profit" value={company.profit} /><Metric label="Agents" value={String(company.agents)} /><Metric label="Missions" value={String(company.missions)} /></div>
              <div className="healthRow"><span>Company health</span><b>{company.health}%</b></div><div className="healthBar"><i style={{ width: `${company.health}%` }} /></div>
              <span className="openCompany">Open company workspace <ArrowUpRight size={16} /></span>
            </Link>
          ))}
          <button className="newCompanyCard"><div className="newCompanyIcon"><Plus size={22} /></div><strong>Create another company</strong><span>Start a new autonomous business workspace</span></button>
        </section>

        <section className="masterBottomGrid">
          <div className="masterPanel"><div className="panelTitle"><div><h2>Portfolio activity</h2><span>What the company network is doing now</span></div><Activity size={17} /></div><div className="masterActivity">{activity.map(a => <div className="masterActivityRow" key={a[0]}><div className="activityPulse"><i /></div><div className="activityCopy"><strong>{a[0]}</strong><span>{a[1]}</span></div><b>{a[2]}</b><small>{a[3]}</small></div>)}</div></div>
          <div className="masterPanel portfolioHealth"><div className="panelTitle"><div><h2>Portfolio control</h2><span>Global safeguards</span></div><ShieldCheck size={17} /></div><div className="controlItem"><span>Real-money execution</span><b>OFF</b></div><div className="controlItem"><span>Emergency reserve</span><b>€500</b></div><div className="controlItem"><span>Human approval</span><b>Required</b></div><div className="controlItem"><span>Critical alerts</span><b className="safe">0</b></div></div>
        </section>
        <footer className="masterFooter">AI Company OS · Master → Companies → Agents → Missions → Results → Learning</footer>
      </section>
    </main>
  );
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <div className="portfolioStat"><div className="statIcon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
