'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, CircleDollarSign, Eye, Pause, Play, ShieldCheck, Sparkles, Target, X } from 'lucide-react'
import { canUseIntegration, requiresHumanApproval, type IntegrationCapability, type IntegrationConnection } from '../../../../lib/integration-control'
import './marketing.css'

type Campaign = { id: number; name: string; channel: string; objective: string; budget: number; duration: number; audience: string; status: 'REVIEW' | 'APPROVED' | 'SCHEDULED' }

const campaigns: Campaign[] = [
  { id: 1, name: 'Café da Tarde', channel: 'Instagram + Facebook', objective: 'Aumentar visitas entre 16h e 19h', budget: 105, duration: 7, audience: 'Raio de 5 km', status: 'REVIEW' },
  { id: 2, name: 'Combo Pequeno-Almoço', channel: 'Instagram Organic', objective: 'Aumentar ticket médio', budget: 0, duration: 14, audience: 'Clientes atuais', status: 'SCHEDULED' },
]

const demoConnections: IntegrationConnection[] = [
  { id: 'meta-alpha', provider: 'meta', account: 'Cafetería Madrid Centro', status: 'READY', capabilities: ['MARKETING_READ', 'MARKETING_CREATE'], updatedAt: 'demo' },
  { id: 'instagram-alpha', provider: 'instagram', account: 'Cafetería Madrid Centro', status: 'CONNECTED', capabilities: ['MARKETING_READ', 'MARKETING_CREATE', 'MARKETING_PUBLISH_ORGANIC'], updatedAt: 'demo' },
]

export default function CompanyMarketingPage({ params }: { params: { companyId: string } }) {
  const [items, setItems] = useState(campaigns)
  const [paused, setPaused] = useState(false)
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [notice, setNotice] = useState('')
  const connectedMeta = demoConnections.find(c => c.provider === 'meta')
  const connectedInstagram = demoConnections.find(c => c.provider === 'instagram')
  const createReady = canUseIntegration(connectedMeta, 'MARKETING_CREATE')
  const organicReady = canUseIntegration(connectedInstagram, 'MARKETING_PUBLISH_ORGANIC')
  const paidNeedsApproval = requiresHumanApproval('MARKETING_PUBLISH_PAID')
  const active = useMemo(() => items.filter(c => c.status === 'REVIEW' || c.status === 'APPROVED').length, [items])

  function approve(id: number) {
    setItems(list => list.map(c => c.id === id ? { ...c, status: 'APPROVED' } : c))
    setNotice('Campanha aprovada. O provider continua bloqueado para publicação paga até autorização explícita.')
    setSelected(null)
  }

  function reject(id: number) {
    setItems(list => list.filter(c => c.id !== id))
    setNotice('Campanha rejeitada e removida da fila.')
    setSelected(null)
  }

  return <main className="tenantMarketing">
    <header><Link href={`/company/${params.companyId}`}><ArrowLeft size={15} /> Company Command</Link><div><span>MARKETING / GOVERNANCE</span><h1>Marketing Control Center</h1><p>O agente pode analisar e preparar. Publicação e dinheiro permanecem sob regras explícitas.</p></div><div className="safe"><i /> SAFE MODE</div></header>

    {notice && <div className="notice"><Check size={15} /> {notice}<button onClick={() => setNotice('')}><X size={13} /></button></div>}

    <section className="connectionStrip"><div><span>PROVIDER CONNECTIONS</span><h2>Identity is not authority.</h2><p>Uma conta conectada só disponibiliza o provider. Cada capability continua passando pelo governance layer.</p></div><div className="providerStates"><State name="Meta Business" state={connectedMeta?.status === 'CONNECTED' ? 'CONNECTED' : 'NOT CONNECTED'}/><State name="Instagram Business" state={connectedInstagram?.status === 'CONNECTED' ? 'CONNECTED' : 'CONNECTED / ORGANIC ONLY'}/><Link href={`/company/${params.companyId}/integrations`}>Manage integrations →</Link></div></section>

    <div className="pipeline"><Step n="01" title="Analyze" state="DONE"/><Step n="02" title="Create" state={createReady ? 'READY' : 'BLOCKED'}/><Step n="03" title="Review" state="HUMAN GATE"/><Step n="04" title="Execute" state={paidNeedsApproval ? 'APPROVAL REQUIRED' : 'READY'}/><Step n="05" title="Measure" state="LOCKED"/></div>

    <div className="grid">
      <section className="panel"><div className="title"><div><span>AUTONOMY POLICY</span><h2>Marketing capabilities</h2></div><ShieldCheck size={18}/></div><Policy label="Read marketing data" mode="AUTO"/><Policy label="Create campaigns" mode={createReady ? 'AUTO' : 'BLOCKED'}/><Policy label="Publish organic content" mode={organicReady ? 'OPTIONAL' : 'BLOCKED'}/><Policy label="Publish paid ads" mode="APPROVAL"/><Policy label="Change budget" mode="APPROVAL"/><div className="guard"><ShieldCheck size={14}/><span>Paid publication requires human approval even when the provider is connected.</span></div></section>
      <section className="panel"><div className="title"><div><span>EXECUTION SAFETY</span><h2>Budget & stop controls</h2></div><CircleDollarSign size={18}/></div><Metric label="Daily maximum" value="€20"/><Metric label="Monthly maximum" value="€300"/><Metric label="Current spend" value="€246"/><div className="meter"><i style={{ width: '82%' }} /></div><button className={`stop ${paused ? 'resume' : ''}`} onClick={() => setPaused(!paused)}>{paused ? <><Play size={14}/> Resume agents</> : <><Pause size={14}/> Emergency stop</>}</button></section>
    </div>

    <section className="panel campaigns"><div className="title"><div><span>CAMPAIGN PIPELINE</span><h2>Campanhas sob controle</h2></div><b>{active} attention</b></div>{items.map(c => <div className="campaign" key={c.id}><div className="icon"><Target size={15}/></div><div className="name"><b>{c.name}</b><small>{c.objective}</small></div><span>{c.channel}</span><strong>€{c.budget}</strong><em>{c.status}</em><button onClick={() => setSelected(c)}><Eye size={14}/> Review</button></div>)}</section>

    {selected && <div className="backdrop"><section className="modal"><button className="close" onClick={() => setSelected(null)}><X size={16}/></button><span>HUMAN APPROVAL GATE</span><h2>{selected.name}</h2><p>{selected.objective}</p><div className="review"><Metric label="CHANNEL" value={selected.channel}/><Metric label="BUDGET" value={`€${selected.budget}`}/><Metric label="DURATION" value={`${selected.duration} days`}/><Metric label="AUDIENCE" value={selected.audience}/></div><div className="risk"><ShieldCheck size={16}/><span>Safety check: budget guard active. Paid publishing remains blocked without explicit approval.</span></div><div className="actions"><button onClick={() => reject(selected.id)}>Reject</button><button disabled={paused} className="primary" onClick={() => approve(selected.id)}><Check size={14}/> Approve</button></div><small>SIMULATION ONLY · nenhuma API externa será chamada</small></section></div>}
  </main>
}

function State({ name, state }: { name: string; state: string }) { return <div className="state"><span>{name}</span><b>{state}</b></div> }
function Step({ n, title, state }: { n: string; title: string; state: string }) { return <div className="step"><small>{n}</small><b>{title}</b><span>{state}</span></div> }
function Policy({ label, mode }: { label: string; mode: string }) { return <div className="policy"><span>{label}</span><b>{mode}</b></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><b>{value}</b></div> }
