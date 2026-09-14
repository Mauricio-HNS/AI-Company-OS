'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, Bot, BrainCircuit, Building2, CircleDollarSign, Gauge, Network, ShieldCheck, Target, Users, Zap } from 'lucide-react'
import './tenant.css'

type Tenant = {
  id: string; name: string; sector: string; market: string; operatingModel: string; objective: string
  status: string; health: number; agents: string[]; modules: string[]; portal: string; createdAt: string
}

const agentNames: Record<string, string> = { ceo: 'CEO', research: 'Research', product: 'Product', sales: 'Sales', cfo: 'Finance' }

export default function TenantDashboard() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    try {
      const tenants = JSON.parse(localStorage.getItem('ai-company-os-tenants') || '[]')
      const found = tenants.find((item: Tenant) => item.id === id)
      if (found) setTenant(found)
      else setMissing(true)
    } catch { setMissing(true) }
  }, [])

  if (!tenant && !missing) return <main className="tenantPage"><div className="tenantLoading">Loading tenant...</div></main>
  if (!tenant) return <main className="tenantPage"><div className="tenantEmpty"><Building2 size={30}/><h1>Tenant not found</h1><p>The requested provisioned company is not available in this browser session.</p><Link href="/master">Back to Master</Link></div></main>

  const cards = [
    [Bot, 'AI Workforce', `${tenant.agents.length} agents`, 'CEO, Research, Product, Sales and Finance'],
    [Target, 'Missions', '0 active', 'Ready to define the first strategic missions'],
    [Zap, 'Tasks', '0 queued', 'Execution queue is ready for activation'],
    [CircleDollarSign, 'Finance', '€0', 'No revenue recorded yet'],
    [BrainCircuit, 'Knowledge', '0 memories', 'Knowledge layer initialized'],
    [Network, 'Operations', 'Ready', 'Autonomous operating loop prepared'],
    [ShieldCheck, 'Security', 'Protected', 'Tenant isolation and controls initialized'],
    [Users, 'Client Portal', 'Private', 'Dedicated portal boundary reserved'],
  ] as const

  return <main className="tenantPage">
    <header className="tenantHeader">
      <div><Link className="tenantBack" href="/master"><ArrowLeft size={15}/> Master Control</Link><span className="tenantEyebrow">TENANT CONTROL CENTER / PROVISIONED</span><h1>{tenant.name}</h1><p>{tenant.sector} · {tenant.market} · {tenant.operatingModel}</p></div>
      <span className="tenantStatus"><i/> BUILDING</span>
    </header>

    <section className="tenantHero">
      <div><span className="tenantLabel">STRATEGIC OBJECTIVE</span><h2>{tenant.objective}</h2><p>The autonomous company foundation is provisioned. Configure missions, agents and operating policies before activation.</p></div>
      <div className="tenantHealth"><Gauge size={19}/><strong>{tenant.health}%</strong><span>System health</span></div>
    </section>

    <section className="tenantStats">
      <div><span>Agents</span><strong>{tenant.agents.length}</strong></div><div><span>Modules</span><strong>{tenant.modules.length}</strong></div><div><span>Revenue</span><strong>€0</strong></div><div><span>Profit</span><strong>€0</strong></div>
    </section>

    <section className="tenantGrid">{cards.map(([Icon, title, value, text]) => <article className="tenantCard" key={title}><div className="tenantCardIcon"><Icon size={18}/></div><span>{title}</span><strong>{value}</strong><p>{text}</p></article>)}</section>

    <section className="tenantAgents"><div><span className="tenantLabel">AI WORKFORCE</span><h2>Core agents</h2></div><div className="agentPills">{tenant.agents.map(id => <span key={id}><Bot size={14}/>{agentNames[id] || id}</span>)}</div></section>

    <footer className="tenantFooter"><span>Tenant ID: {tenant.id}</span><span>Created {new Date(tenant.createdAt).toLocaleString()}</span></footer>
  </main>
}
