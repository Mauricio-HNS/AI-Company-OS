'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, CircleDollarSign, Eye, Pause, Play, ShieldCheck, Target, X, PlugZap, History, BrainCircuit } from 'lucide-react'
import { canUseIntegration, requiresHumanApproval, type IntegrationConnection } from '../../../../lib/integration-control'
import { appendMarketingAudit, emptyTenantMarketingState, readTenantConnections, readTenantMarketingState, saveTenantMarketingState, type MarketingCampaign, type TenantMarketingState } from '../../../../lib/tenant-marketing'
import './marketing.css'

function seedCampaigns(companyId: string): MarketingCampaign[] {
  const now = new Date().toISOString()
  return [
    { id: `${companyId}-campaign-1`, companyId, name: 'Café da Tarde', channel: 'Instagram + Facebook', objective: 'Aumentar visitas entre 16h e 19h', budget: 105, duration: 7, audience: 'Raio de 5 km', status: 'REVIEW', createdAt: now, updatedAt: now },
    { id: `${companyId}-campaign-2`, companyId, name: 'Combo Pequeno-Almoço', channel: 'Instagram Organic', objective: 'Aumentar ticket médio', budget: 0, duration: 14, audience: 'Clientes atuais', status: 'SCHEDULED', createdAt: now, updatedAt: now },
  ]
}

export default function CompanyMarketingPage({ params }: { params: { companyId: string } }) {
  const [state, setState] = useState<TenantMarketingState>(() => emptyTenantMarketingState(params.companyId))
  const [connections, setConnections] = useState<IntegrationConnection[]>([])
  const [paused, setPaused] = useState(false)
  const [selected, setSelected] = useState<MarketingCampaign | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const stored = readTenantMarketingState(params.companyId)
    const next = stored.campaigns.length ? stored : { ...stored, campaigns: seedCampaigns(params.companyId) }
    setState(next)
    if (!stored.campaigns.length) saveTenantMarketingState(next)
    setConnections(readTenantConnections(params.companyId))
  }, [params.companyId])

  const connectedMeta = connections.find(c => c.id === 'meta')
  const connectedInstagram = connections.find(c => c.id === 'instagram')
  const createReady = canUseIntegration(connectedMeta, 'MARKETING_CREATE')
  const organicReady = canUseIntegration(connectedInstagram, 'MARKETING_PUBLISH_ORGANIC')
  const paidNeedsApproval = requiresHumanApproval('MARKETING_PUBLISH_PAID')
  const active = useMemo(() => state.campaigns.filter(c => c.status === 'REVIEW' || c.status === 'APPROVED').length, [state.campaigns])

  function update(next: TenantMarketingState, message: string) {
    setState(next)
    saveTenantMarketingState(next)
    setNotice(message)
  }

  function approve(id: string) {
    const campaign = state.campaigns.find(c => c.id === id)
    if (!campaign) return
    const nextState = appendMarketingAudit({ ...state, campaigns: state.campaigns.map(c => c.id === id ? { ...c, status: 'APPROVED', updatedAt: new Date().toISOString() } : c) }, { type: 'CAMPAIGN_APPROVED', campaignId: id, message: `Campaign ${campaign.name} approved by human gate.` })
    update(nextState, 'Campanha aprovada. A publicação paga continua bloqueada sem autorização explícita de execução.')
    setSelected(null)
  }

  function reject(id: string) {
    const campaign = state.campaigns.find(c => c.id === id)
    if (!campaign) return
    const nextState = appendMarketingAudit({ ...state, campaigns: state.campaigns.map(c => c.id === id ? { ...c, status: 'REJECTED', updatedAt: new Date().toISOString() } : c) }, { type: 'CAMPAIGN_REJECTED', campaignId: id, message: `Campaign ${campaign.name} rejected.` })
    update(nextState, 'Campanha rejeitada e preservada no histórico para análise posterior.')
    setSelected(null)
  }

  function toggleStop() {
    const nextPaused = !paused
    const nextState = appendMarketingAudit(state, { type: nextPaused ? 'EMERGENCY_STOP' : 'CAMPAIGN_RESUMED', message: nextPaused ? 'Marketing execution paused by emergency stop.' : 'Marketing execution resumed.' })
    setPaused(nextPaused)
    update(nextState, nextPaused ? 'Emergency stop ativado. Nenhuma execução externa é permitida.' : 'Marketing retomado sob as mesmas regras de governança.')
  }

  return <main className="tenantMarketing">
    <header><Link href={`/company/${params.companyId}`}><ArrowLeft size={15} /> Company Command</Link><div><span>MARKETING / TENANT {params.companyId.toUpperCase()}</span><h1>Marketing Control Center</h1><p>Central exclusiva desta empresa: contas, campanhas, histórico, análise e aprovações nunca atravessam o limite do tenant.</p></div><div className="safe"><i /> ISOLATED</div></header>
    {notice && <div className="notice"><Check size={15} /> {notice}<button onClick={() => setNotice('')}><X size={13} /></button></div>}

    <section className="connectionStrip"><div><span>PROVIDER CONNECTIONS</span><h2>Identity is not authority.</h2><p>As conexões são lidas somente pelo companyId atual. Uma conta conectada não concede autorização automática para publicar ou gastar.</p></div><div className="providerStates"><State name="Meta Business" state={connectedMeta?.status === 'CONNECTED' ? 'CONNECTED' : 'NOT CONNECTED'}/><State name="Instagram Business" state={connectedInstagram?.status === 'CONNECTED' ? 'CONNECTED' : 'NOT CONNECTED'}/><Link href={`/company/${params.companyId}/integrations`}><PlugZap size={13}/> Manage integrations →</Link></div></section>

    <div className="pipeline"><Step n="01" title="Analyze" state="DONE"/><Step n="02" title="Create" state={createReady ? 'READY' : 'WAITING CONNECTION'}/><Step n="03" title="Review" state="HUMAN GATE"/><Step n="04" title="Execute" state={paidNeedsApproval ? 'APPROVAL REQUIRED' : 'READY'}/><Step n="05" title="Measure" state="READY"/></div>

    <div className="grid">
      <section className="panel"><div className="title"><div><span>AUTONOMY POLICY</span><h2>Marketing capabilities</h2></div><ShieldCheck size={18}/></div><Policy label="Read marketing data" mode="AUTO"/><Policy label="Create campaigns" mode={createReady ? 'AUTO' : 'BLOCKED'}/><Policy label="Publish organic content" mode={organicReady ? 'OPTIONAL' : 'BLOCKED'}/><Policy label="Publish paid ads" mode="APPROVAL"/><Policy label="Change budget" mode="APPROVAL"/><div className="guard"><ShieldCheck size={14}/><span>Every company has its own provider accounts, policy and audit trail.</span></div></section>
      <section className="panel"><div className="title"><div><span>EXECUTION SAFETY</span><h2>Budget & stop controls</h2></div><CircleDollarSign size={18}/></div><Metric label="Daily maximum" value="€20"/><Metric label="Monthly maximum" value="€300"/><Metric label="Current spend" value="€246"/><div className="meter"><i style={{ width: '82%' }} /></div><button className={`stop ${paused ? 'resume' : ''}`} onClick={toggleStop}>{paused ? <><Play size={14}/> Resume agents</> : <><Pause size={14}/> Emergency stop</>}</button></section>
    </div>

    <section className="panel campaigns"><div className="title"><div><span>CAMPAIGN PIPELINE</span><h2>Campanhas desta empresa</h2></div><b>{active} attention</b></div>{state.campaigns.map(c => <div className="campaign" key={c.id}><div className="icon"><Target size={15}/></div><div className="name"><b>{c.name}</b><small>{c.objective}</small></div><span>{c.channel}</span><strong>€{c.budget}</strong><em>{c.status}</em><button onClick={() => setSelected(c)}><Eye size={14}/> Review</button></div>)}</section>

    <section className="panel campaigns"><div className="title"><div><span>MARKETING MEMORY</span><h2>History & intelligence</h2></div><History size={18}/></div>{state.audit.length ? state.audit.slice(0, 8).map(event => <div className="campaign" key={event.id}><div className="icon"><BrainCircuit size={15}/></div><div className="name"><b>{event.type.replaceAll('_', ' ')}</b><small>{event.message}</small></div><span>{new Date(event.createdAt).toLocaleString()}</span><em>AUDIT</em></div>) : <div className="runtimeEmpty">Nenhum evento de marketing foi registrado ainda.</div>}</section>

    {selected && <div className="backdrop"><section className="modal"><button className="close" onClick={() => setSelected(null)}><X size={16}/></button><span>HUMAN APPROVAL GATE</span><h2>{selected.name}</h2><p>{selected.objective}</p><div className="review"><Metric label="CHANNEL" value={selected.channel}/><Metric label="BUDGET" value={`€${selected.budget}`}/><Metric label="DURATION" value={`${selected.duration} days`}/><Metric label="AUDIENCE" value={selected.audience}/></div><div className="risk"><ShieldCheck size={16}/><span>Safety check: budget guard active. Paid publishing remains blocked without explicit execution approval.</span></div><div className="actions"><button onClick={() => reject(selected.id)}>Reject</button><button disabled={paused} className="primary" onClick={() => approve(selected.id)}><Check size={14}/> Approve</button></div><small>SIMULATION ONLY · nenhuma API externa será chamada</small></section></div>}
  </main>
}

function State({ name, state }: { name: string; state: string }) { return <div className="state"><span>{name}</span><b>{state}</b></div> }
function Step({ n, title, state }: { n: string; title: string; state: string }) { return <div className="step"><small>{n}</small><b>{title}</b><span>{state}</span></div> }
function Policy({ label, mode }: { label: string; mode: string }) { return <div className="policy"><span>{label}</span><b>{mode}</b></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><b>{value}</b></div> }
