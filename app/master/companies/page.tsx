'use client';

import Link from 'next/link';
import MasterSidebar from '../../../ui/master/MasterSidebar';
import '../master.css';

const companies = [
  ['alpha','Company Alpha','AI SaaS Platform','Operational','18','€38,420'],
  ['beta','Company Beta','AI Commerce','Operational','11','€21,830'],
  ['gamma','Company Gamma','AI Automation','Building','7','€4,280'],
];

export default function MasterCompaniesPage() {
  return <main className="masterShell"><MasterSidebar active="companies"/><section className="masterMain">
    <header className="masterHeader"><div><div className="masterEyebrow">MASTER CONTROL / COMPANIES</div><h1>Companies</h1><p>Every autonomous company has its own isolated workspace, agents and operating rules.</p></div></header>
    <section className="companyGrid">{companies.map(([id,name,type,status,agents,revenue])=><Link key={id} href={`/company/${id}`} className="masterCompanyCard companyCardLink"><div className="companyCardTop"><div className="companyIdentity"><div className="companyLogo">{name.slice(-1)}</div><div><h3>{name}</h3><span>{type}</span></div></div><span className={`statusBadge ${status==='Operational'?'':'building'}`}><i/>{status}</span></div><div className="companyMetrics"><Metric label="Revenue" value={revenue}/><Metric label="Agents" value={agents}/><Metric label="Workspace" value="Isolated"/><Metric label="Runtime" value="Live"/></div><span className="openCompany">Open company workspace →</span></Link>)}</section>
  </section></main>
}
function Metric({label,value}:{label:string;value:string}){return <div><span>{label}</span><strong>{value}</strong></div>}
