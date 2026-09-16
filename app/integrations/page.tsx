'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronRight, CircleAlert, ExternalLink, KeyRound, Lock, PlugZap, ShieldCheck, Sparkles, X } from 'lucide-react'
import './integrations.css'

type Integration = {
  id: string
  name: string
  category: string
  description: string
  status: 'CONNECTED' | 'READY' | 'REQUIRES_SETUP'
  account?: string
}

const initialIntegrations: Integration[] = [
  { id: 'meta', name: 'Meta Business', category: 'Marketing', description: 'Facebook Pages, Instagram Business and Ads Manager.', status: 'REQUIRES_SETUP' },
  { id: 'google-ads', name: 'Google Ads', category: 'Marketing', description: 'Campaigns, audiences, spend limits and performance.', status: 'READY' },
  { id: 'instagram', name: 'Instagram Business', category: 'Social', description: 'Organic publishing, insights and content workflows.', status: 'READY' },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Communication', description: 'Customer conversations and approved message templates.', status: 'READY' },
  { id: 'stripe', name: 'Stripe', category: 'Finance', description: 'Payments, subscriptions and revenue events.', status: 'READY' },
  { id: 'crm', name: 'CRM / Customer Data', category: 'Sales', description: 'Leads, customers, lifecycle and conversion events.', status: 'READY' },
]

export default function IntegrationsPage() {
  const [items, setItems] = useState(initialIntegrations)
  const [selected, setSelected] = useState<Integration | null>(null)
  const [account, setAccount] = useState('')
  const [saved, setSaved] = useState('')
  const connected = useMemo(() => items.filter(item => item.status === 'CONNECTED').length, [items])

  function openSetup(item: Integration) {
    setSelected(item)
    setAccount(item.account ?? '')
    setSaved('')
  }

  function connect() {
    if (!selected || !account.trim()) return
    setItems(current => current.map(item => item.id === selected.id ? { ...item, status: 'CONNECTED', account: account.trim() } : item))
    setSaved(`${selected.name} configurado para ${account.trim()}. As credenciais secretas continuam fora do navegador.`)
    setSelected(null)
  }

  return <main className="integrationShell">
    <header className="integrationHeader">
      <div className="integrationBrand"><div className="integrationLogo">AI</div><div><strong>AI Company OS</strong><span>CONNECTIONS CENTER</span></div></div>
      <Link href="/" className="integrationBack"><ArrowLeft size={15}/> Command Center</Link>
    </header>

    <section className="integrationHero">
      <div>
        <span className="integrationEyebrow"><PlugZap size={14}/> Business integrations</span>
        <h1>Connect the company to the outside world.</h1>
        <p>Configure the accounts your AI workforce may use. The OS separates account identity from secret credentials and keeps external actions behind permission gates.</p>
      </div>
      <div className="connectionScore"><div className="scoreOrb"><PlugZap size={22}/></div><div><small>CONNECTED</small><strong>{connected} / {items.length}</strong><span>providers enabled</span></div></div>
    </section>

    {saved && <div className="integrationNotice"><Check size={16}/><span>{saved}</span><button onClick={() => setSaved('')}><X size={14}/></button></div>}

    <section className="securityBanner"><div className="securityIcon"><Lock size={17}/></div><div><strong>Credential boundary</strong><span>Never place API keys, OAuth client secrets or passwords in localStorage, query strings or client-side source. Production connections should be completed server-side and referenced by an opaque connection ID.</span></div><ShieldCheck size={18}/>
    </section>

    <div className="integrationGrid">
      {items.map(item => <article className="integrationCard" key={item.id}>
        <div className="cardTop"><div className="providerIcon">{item.name.slice(0, 2).toUpperCase()}</div><span className={`integrationStatus ${item.status.toLowerCase()}`}><i/>{item.status === 'CONNECTED' ? 'CONNECTED' : item.status === 'READY' ? 'READY' : 'SETUP REQUIRED'}</span></div>
        <div className="providerCategory">{item.category}</div>
        <h2>{item.name}</h2>
        <p>{item.description}</p>
        {item.account ? <div className="connectedAccount"><Check size={13}/><span>{item.account}</span></div> : <div className="notConnected"><CircleAlert size={13}/><span>No account connected</span></div>}
        <button className="connectButton" onClick={() => openSetup(item)}>{item.status === 'CONNECTED' ? 'Manage connection' : 'Configure connection'} <ChevronRight size={15}/></button>
      </article>)}
    </div>

    <section className="integrationArchitecture">
      <div><span className="integrationEyebrow"><Sparkles size={14}/> How autonomy works</span><h2>Identity → Permission → Action → Audit</h2><p>The AI can prepare work automatically, but a connected provider does not automatically grant authority. Each external action is evaluated against company policy, budget and the current user's permission.</p></div>
      <div className="architectureSteps"><Step n="01" title="Connect" text="Register provider account"/><Step n="02" title="Authorize" text="Define allowed capabilities"/><Step n="03" title="Execute" text="Run only permitted actions"/><Step n="04" title="Audit" text="Record result and evidence"/></div>
    </section>

    <footer>AI COMPANY OS · CONNECTIONS ARE INACTIVE UNTIL EXPLICITLY AUTHORIZED</footer>

    {selected && <div className="modalBackdrop"><section className="connectionModal"><button className="modalClose" onClick={() => setSelected(null)}><X size={16}/></button><span className="integrationEyebrow"><KeyRound size={14}/> Connection setup</span><h2>{selected.name}</h2><p>{selected.description}</p><label>Account / workspace identifier<input autoFocus value={account} onChange={event => setAccount(event.target.value)} placeholder="e.g. business@company.com"/></label><div className="modalSafety"><Lock size={15}/><div><strong>Secret boundary</strong><small>This demo records only the account identifier. Passwords and private keys are never stored in the browser.</small></div></div><div className="modalActions"><button onClick={() => setSelected(null)}>Cancel</button><button className="primary" disabled={!account.trim()} onClick={connect}><Check size={15}/> Save connection</button></div><small className="simulation">SIMULATION MODE · OAuth/API authorization is the next production integration step.</small></section></div>}
  </main>
}

function Step({ n, title, text }: { n: string; title: string; text: string }) { return <div className="architectureStep"><b>{n}</b><strong>{title}</strong><span>{text}</span></div> }
