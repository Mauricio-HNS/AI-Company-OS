'use client'

import Link from 'next/link'
import { Activity, Building2, CircleDollarSign, Gauge, ShieldCheck, Users } from 'lucide-react'
import './master-sidebar.css'

export default function MasterSidebar({ active }: { active: string }) {
  const items = [
    ['overview','Portfolio Overview','/master',Gauge],
    ['companies','Companies','/master/companies',Building2],
    ['workforce','AI Workforce','/master/workforce',Users],
    ['capital','Capital','/master/capital',CircleDollarSign],
    ['risk','Risk & Policies','/master/risk',ShieldCheck],
  ] as const

  return <aside className="masterSidebar">
    <div className="masterBrand"><div className="masterLogo">AI</div><div><strong>AI Company OS</strong><span>MASTER CONTROL</span></div></div>
    <nav className="masterNav" aria-label="Master navigation">
      {items.map(([id,label,href,Icon]) => <Link key={id} href={href} className={`masterNavItem ${active===id?'active':''}`}><Icon size={17}/>{label}</Link>)}
    </nav>
    <div className="masterSidebarBottom">
      <div className="masterSystem"><i/>All systems operational</div>
      <Link href="/" className="backLink">← Company OS</Link>
    </div>
  </aside>
}
