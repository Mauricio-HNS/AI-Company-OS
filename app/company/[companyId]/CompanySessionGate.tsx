'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ShieldCheck, UserRound } from 'lucide-react'
import type { CompanyRole, CompanySession } from '../../../lib/company-access-control'

export default function CompanySessionGate({ companyId, companyName, children }: { companyId: string; companyName: string; children: ReactNode }) {
  const [session, setSession] = useState<CompanySession | null>(null)
  const [userId, setUserId] = useState('manager')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem(`company-session:${companyId}`)
    if (stored) setSession(JSON.parse(stored) as CompanySession)
  }, [companyId])

  function enter() {
    const roles: Record<string, { displayName: string; role: CompanyRole }> = {
      manager: { displayName: 'Gerente', role: 'MANAGER' },
      owner: { displayName: 'Proprietário', role: 'OWNER' },
      employee: { displayName: 'Funcionário', role: 'EMPLOYEE' },
      viewer: { displayName: 'Consulta', role: 'VIEWER' },
    }
    const identity = roles[userId]
    if (!identity) return
    const next: CompanySession = { companyId, userId, ...identity, authenticatedAt: new Date().toISOString(), sessionId: `${companyId}-${userId}-${Date.now()}` }
    sessionStorage.setItem(`company-session:${companyId}`, JSON.stringify(next))
    setSession(next)
  }

  if (!session) return <main className="companyAccess"><section className="companyAccessCard"><div className="companyAccessMark">AI</div><span>COMPANY ACCESS</span><h1>{companyName}</h1><p>Identifique quem está entrando na operação. A autenticação forte da empresa pode ser conectada ao provedor de identidade na fase de produção.</p><label><UserRound size={15}/> Perfil<select value={userId} onChange={event => setUserId(event.target.value)}><option value="manager">Gerente</option><option value="owner">Proprietário</option><option value="employee">Funcionário</option><option value="viewer">Consulta</option></select></label><button onClick={enter}><ShieldCheck size={15}/> Entrar como {userId}</button><small>Modo de desenvolvimento: a identidade é simulada. Em produção, a sessão deve ser emitida por um provedor de identidade e a chave do gerente nunca deve ser armazenada no navegador.</small>{notice && <em>{notice}</em>}</section></main>

  return <>{children}</>
}
