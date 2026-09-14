import Link from 'next/link'
import './new-company.css'

const steps = [
  ['01', 'Identity', 'Define the company name, sector and operating objective.'],
  ['02', 'AI Workforce', 'Start with CEO, Research, Product, Sales and Finance agents.'],
  ['03', 'Operating System', 'Provision missions, tasks, memory, security and finance modules.'],
  ['04', 'Client Portal', 'Create an isolated portal and dashboard for the company.'],
]

export default function NewCompanyPage() {
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
          <label>Company name<input placeholder="Example: Company Delta" /></label>
          <label>Sector<input placeholder="Example: AI Healthcare" /></label>
          <label>Primary market<input placeholder="Spain / Europe" /></label>
          <label>Operating model<select defaultValue="ai-first"><option value="ai-first">AI-first autonomous</option><option value="hybrid">Hybrid human + AI</option><option value="human-led">Human-led with AI support</option></select></label>
        </div>
        <label className="fullField">Strategic objective<textarea placeholder="What must this company achieve first?" rows={4} /></label>
        <div className="provisionActions"><Link className="secondaryButton" href="/master">Cancel</Link><button className="primaryButton" type="button">Initialize tenant</button></div>
      </section>
    </main>
  )
}
