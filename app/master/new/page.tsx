'use client'

import Link from 'next/link'
import { useState } from 'react'
import './new-company.css'

const steps = [
  ['01', 'Identity', 'Define the company name, sector and operating objective.'],
  ['02', 'AI Workforce', 'Start with CEO, Research, Product, Sales and Finance agents.'],
  ['03', 'Operating System', 'Provision missions, tasks, memory, security and finance modules.'],
  ['04', 'Client Portal', 'Create an isolated portal and dashboard for the company.'],
]

const modules = ['Agents', 'Missions', 'Tasks', 'Products', 'Customers', 'Finance', 'Intelligence', 'Knowledge', 'Operations', 'Security', 'Settings']

export default function NewCompanyPage() {
  const [name, setName] = useState('')
  const [sector, setSector] = useState('')
  const [market, setMarket] = useState('Spain / Europe')
  const [model, setModel] = useState('ai-first')
  const [objective, setObjective] = useState('')
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null)

  function initializeTenant() {
    const cleanName = name.trim()
    if (!cleanName) return
    const id = `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tenant'}-${Date.now().toString(36)}`
    const tenant = {
      id,
      name: cleanName,
      sector: sector.trim() || 'AI Business',
      market,
      operatingModel: model,
      objective: objective.trim() || 'Define first strategic objective',
      status: 'building',
      health: 100,
      agents: ['ceo', 'research', 'product', 'sales', 'cfo'],
      modules,
      portal: `/portal/${id}`,
      createdAt: new Date().toISOString(),
    }
    const current = JSON.parse(localStorage.getItem('ai-company-os-tenants') || '[]')
    localStorage.setItem('ai-company-os-tenants', JSON.stringify([...current, tenant]))
    setCreated({ id, name: cleanName })
  }

  if (created) {
    return (
      <main className="provisionPage">
        <header className="provisionHeader">
          <div>
            <span className="eyebrow">AI COMPANY OS / TENANT CREATED</span>
            <h1>{created.name} is initialized.</h1>
            <p>The tenant boundary and its operating blueprint are now stored locally for this control-plane session.</p>
          </div>
          <Link className="backLink" href="/master">Back to Master</Link>
        </header>

        <section className="provisionHero">
          <div>
            <span className="statusPill">BUILDING / READY FOR CONFIGURATION</span>
            <h2>Autonomous company foundation created.</h2>
            <p>Five core agents and the complete operating module map have been provisioned for this tenant.</p>
          </div>
          <div className="provisionPreview">
            <div><strong>Tenant ID</strong><span>{created.id}</span></div>
            <div><strong>AI Workforce</strong><span>5 core agents</span></div>
            <div><strong>Modules</strong><span>{modules.length} initialized</span></div>
          </div>
        </section>

        <section className="stepsGrid">
          {modules.map((module, index) => (
            <article className="stepCard" key={module}>
              <span className="stepNumber">{String(index + 1).padStart(2, '0')}</span>
              <h3>{module}</h3>
              <p>Tenant-isolated module initialized and ready for configuration.</p>
            </article>
          ))}
        </section>

        <section className="provisionActions finalActions">
          <Link className="secondaryButton" href="/master">Open Master Control</Link>
          <button className="primaryButton" type="button" onClick={() => setCreated(null)}>Provision another company</button>
        </section>
      </main>
    )
  }

  return (
    <main className="provisionPage">
      <header className="provisionHeader">
        <div>
          <span className="eyebrow">AI COMPANY OS / CONTROL PLANE</span>
          <h1>Provision a new AI company</h1>
          <p>Create an isolated company environment with its own AI workforce, operating data and client portal.</p>
        </div>
        <Link className="backLink" href="/master">Back to Master</Link>
      </header>

      <section className="provisionHero">
        <div>
          <span className="statusPill">PROVISIONING READY</span>
          <h2>From zero to an autonomous company.</h2>
          <p>The control plane prepares the tenant boundary first. Business modules can then evolve independently without mixing company data.</p>
        </div>
        <div className="provisionPreview">
          <div><strong>Tenant</strong><span>Isolated workspace</span></div>
          <div><strong>AI Workforce</strong><span>5 core agents</span></div>
          <div><strong>Portal</strong><span>Private client dashboard</span></div>
        </div>
      </section>

      <section className="stepsGrid">
        {steps.map(([number, title, text]) => (
          <article className="stepCard" key={number}>
            <span className="stepNumber">{number}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="provisionForm">
        <div className="formHeader"><span className="eyebrow">TENANT DEFINITION</span><h2>Company blueprint</h2></div>
        <div className="formGrid">
          <label>Company name<input value={name} onChange={e => setName(e.target.value)} placeholder="Example: Company Delta" /></label>
          <label>Sector<input value={sector} onChange={e => setSector(e.target.value)} placeholder="Example: AI Healthcare" /></label>
          <label>Primary market<input value={market} onChange={e => setMarket(e.target.value)} placeholder="Spain / Europe" /></label>
          <label>Operating model<select value={model} onChange={e => setModel(e.target.value)}><option value="ai-first">AI-first autonomous</option><option value="hybrid">Hybrid human + AI</option><option value="human-led">Human-led with AI support</option></select></label>
        </div>
        <label className="fullField">Strategic objective<textarea value={objective} onChange={e => setObjective(e.target.value)} placeholder="What must this company achieve first?" rows={4} /></label>
        <div className="provisionActions"><Link className="secondaryButton" href="/master">Cancel</Link><button className="primaryButton" type="button" disabled={!name.trim()} onClick={initializeTenant}>Initialize tenant</button></div>
      </section>
    </main>
  )
}
