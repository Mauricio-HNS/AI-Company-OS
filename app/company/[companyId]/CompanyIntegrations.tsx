'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, CircleAlert, KeyRound, Lock, PlugZap, ShieldCheck, X } from 'lucide-react'
import { DEFAULT_INTEGRATION_CAPABILITIES, type IntegrationCapability, type IntegrationConnection, requiresHumanApproval } from '../../../lib/integration-control'

type Provider = { id: string; name: string; category: string; description: string }

const providers: Provider[] = [
  { id: 'meta', name: 'Meta Business', category: 'Marketing', description: 'Facebook Pages, Instagram Business and Ads Manager.' },
  { id: 'google-ads', name: 'Google Ads', category: 'Marketing', description: 'Campaigns, audiences, spend limits and performance.' },
  { id: 'instagram', name: 'Instagram Business', category: 'Social', description: 'Organic publishing, insights and content workflows.' },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Communication', description: 'Customer conversations and approved message templates.' },
  { id: 'stripe', name: 'Stripe', category: 'Finance', description: 'Payments, subscriptions and revenue events.' },
  { id: 'crm', name: 'CRM / Customer Data', category: 'Sales', description: 'Leads, customers, lifecycle and conversion events.' },
]

const STORAGE_PREFIX = 'company-integrations:'

export default function CompanyIntegrations({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [connections, setConnections] = useState<IntegrationConnection[]>([])
  const [selected, setSelected] = useState<Provider | null>(null)
  const [account, setAccount] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${companyId}`)
      if (raw) setConnections(JSON.parse(raw) as IntegrationConnection[])
    } catch { setConnections([]) }
  }, [companyId])

  const connected = useMemo(() => connections.filter(item => item.status === 'CONNECTED').length, [connections])

  function persist(next: IntegrationConnection[]) {
    setConnections(next)
    localStorage.setItem(`${STORAGE_PREFIX}${companyId}`, JSON.stringify(next))
  }

  function openSetup(provider: Provider) {
    const current = connections.find(item => item.id === provider.id)
    setSelected(provider)
    setAccount(current?.account ?? '')
    setSaved('')
  }

  function saveConnection() {
    if (!selected || !account.trim()) return
    const next: IntegrationConnection = {
      id: selected.id,
      provider: selected.name,
      account: account.trim(),
      status: 'CONNECTED',
      capabilities: DEFAULT_INTEGRATION_CAPABILITIES[selected.id] ?? [],
      updatedAt: new Date().toISOString(),
    }
    persist([...connections.filter(item => item.id !== selected.id), next])
    setSaved(`${selected.name} conectado à empresa ${companyName}. Apenas capacidades iniciais seguras foram habilitadas.`)
    setSelected(null)
  }

  function disconnect(id: string) {
    persist(connections.filter(item => item.id !== id))
    setSaved('Conexão removida. Nenhuma credencial secreta foi armazenada no navegador.')
  }

  return <section className="runtimeModule companyIntegrations">
    <div className="runtimeModuleHeader integrationModuleHeader"><div><span>COMPANY / CONNECTIONS</span><h2>Integrations Control Center</h2><p>Conexões isoladas por empresa. Conta, capacidades e autorização ficam separados das credenciais secretas.</p></div><div className="integrationConnectionCount"><small>CONNECTED</small><strong>{connected} / {providers.length}</strong></div></div>

    {saved && <div className="runtimeNotice"><Check size={15}/><span>{saved}</span><button onClick={() => setSaved('')}><X size={13}/></button></div>}

    <div className="integrationSecurity"><Lock size={16}/><div><strong>Credential boundary</strong><span>Este modo registra somente o identificador da conta. API keys, OAuth secrets e passwords não entram no localStorage.</span></div><ShieldCheck size={17}/></div>

    <div className="runtimeCards integrationCards">
      {providers.map(provider => {
        const connection = connections.find(item => item.id === provider.id)
        return <article className="runtimeCard integrationRuntimeCard" key={provider.id}>
          <div className="integrationCardTop"><div className="runtimeCardIcon"><PlugZap size={17}/></div><span className={connection ? 'connectedPill' : 'readyPill'}><i/>{connection ? 'CONNECTED' : 'READY'}</span></div>
          <small>{provider.category}</small><strong>{provider.name}</strong><span>{provider.description}</span>
          {connection ? <div className="integrationAccount"><Check size={12}/>{connection.account}</div> : <div className="integrationAccount muted"><CircleAlert size={12}/> No account connected</div>}
          <div className="integrationCapabilities">{(connection?.capabilities ?? DEFAULT_INTEGRATION_CAPABILITIES[provider.id] ?? []).map(cap => <em key={cap}>{cap.replaceAll('_', ' ')}</em>)}</div>
          <div className="integrationActions"><button onClick={() => openSetup(provider)}>{connection ? 'Manage' : 'Configure'} <ChevronRight size={14}/></button>{connection && <button className="danger" onClick={() => disconnect(provider.id)}>Disconnect</button>}</div>
        </article>
      })}
    </div>

    <div className="integrationPolicy"><div><span>AUTHORITY MODEL</span><h3>Connection ≠ permission ≠ execution</h3><p>A connected provider does not authorize the AI to publish, spend money or send messages automatically. External actions must pass company policy, role permissions and the relevant approval gate.</p></div><div className="integrationPolicyFlow"><b>IDENTITY</b><span>→</span><b>CAPABILITY</b><span>→</span><b>POLICY</b><span>→</span><b>ACTION</b><span>→</span><b>AUDIT</b></div></div>

    {selected && <div className="modalBackdrop"><section className="connectionModal"><button className="modalClose" onClick={() => setSelected(null)}><X size={16}/></button><span className="integrationEyebrow"><KeyRound size={14}/> Company connection</span><h2>{selected.name}</h2><p>{selected.description}</p><label>Account / workspace identifier<input autoFocus value={account} onChange={event => setAccount(event.target.value)} placeholder="e.g. business@company.com"/></label><div className="modalSafety"><Lock size={15}/><div><strong>Secret boundary</strong><small>Somente o identificador será persistido. A autorização OAuth/API deverá acontecer no backend na fase de produção.</small></div></div><div className="modalActions"><button onClick={() => setSelected(null)}>Cancel</button><button className="primary" disabled={!account.trim()} onClick={saveConnection}><Check size={15}/> Save connection</button></div><small className="simulation">SIMULATION MODE · conexão real e OAuth ainda não executam chamadas externas.</small></section></div>}
  </section>
}

export function integrationCapabilityLabel(capability: IntegrationCapability) {
  return `${capability.replaceAll('_', ' ')}${requiresHumanApproval(capability) ? ' · APPROVAL' : ''}`
}
