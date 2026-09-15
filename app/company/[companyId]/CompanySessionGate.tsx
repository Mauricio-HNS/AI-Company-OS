'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ShieldCheck, UserRound } from 'lucide-react'
import type { CompanySession } from '../../../lib/company-access-control'

export default function CompanySessionGate({ companyId, companyName, children }: { companyId: string; companyName: string; children: ReactNode }) {
  const [session, setSession] = useState<CompanySession | null>(null)
  const [userId, setUserId] = useState('manager')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(`company-session:${companyId}`)
    if (stored) setSession(JSON.parse(stored) as CompanySession)
  }, [companyId])

  async function enter() {
    const managerKey = window.prompt('Chave de acesso da empresa')
    if (!managerKey) return
    setBusy(true)
    setNotice('')
    try {
      const response = await fetch('/api/company-auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ companyId, userId, managerKey }) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error ?? 'Acesso negado.')
      sessionStorage.setItem(`company-session:${companyId}`, JSON.stringify(data.session))
      setSession(data.session as CompanySession)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Acesso negado.')
    } finally {
      setBusy(false)
    }
  }

  if (!session) return <main className="companyAccess"><section className="companyAccessCard"><div className="companyAccessMark">AI</div><span>COMPANY ACCESS</span><h1>{companyName}</h1><p>Identifique quem está entrando na operação. A chave é verificada no servidor e não é armazenada no navegador.</p><label><UserRound size={15}/> Perfil<select value={userId} onChange={event => setUserId(event.target.value)}><option value="manager">Gerente</option><option value="owner">Proprietário</option><option value="employee">Funcionário</option><option value="viewer">Consulta</option></select></label><button onClick={enter} disabled={busy}><ShieldCheck size={15}/> {busy ? 'Verificando…' : `Entrar como ${userId}`}</button><small>Ações críticas continuam sujeitas às permissões do usuário e aprovação explícita.</small>{notice && <em>{notice}</em>}</section></main>

  return <>{children}</>
}
