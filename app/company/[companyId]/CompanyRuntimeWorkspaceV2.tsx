'use client'

import { useEffect, useState } from 'react'
import type { CompanySession } from '../../../lib/company-access-control'
import { CompanyView } from '../../../ui/company/CompanyNavigation'
import CompanySidebar from '../../../ui/company/CompanySidebar'
import CompanyTopbar from '../../../ui/company/CompanyTopbar'
import CompanyContent from '../../../ui/company/CompanyContent'
import CompanyRuntimeContent from '../../../ui/company/CompanyRuntimeContent'
import styles from './CompanyRuntimeWorkspaceV2.module.css'

type Company = { name: string; type: string; revenue: string; profit: string; health: string; agents: number; missions: number; objective: string }

export default function CompanyRuntimeWorkspaceV2({ company, companyId, initialView = 'Dashboard' }: { company: Company; companyId: string; initialView?: CompanyView }) {
  const [view, setView] = useState<CompanyView>(initialView)
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [session, setSession] = useState<CompanySession | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(`company-session:${companyId}`)
    if (!raw) return
    try { setSession(JSON.parse(raw)) } catch { setSession(null) }
  }, [companyId])

  function changeView(nextView: CompanyView) {
    setView(nextView)
    setProfileOpen(false)
  }

  return (
    <main className={`${styles.workspace} ${collapsed ? styles.collapsed : ''}`}>
      <CompanySidebar company={company} view={view} collapsed={collapsed} onViewChange={changeView} onToggle={() => setCollapsed(value => !value)} />
      <section className={styles.main}>
        <CompanyTopbar companyName={company.name} companyId={companyId} session={session} profileOpen={profileOpen} onProfileToggle={() => setProfileOpen(value => !value)} onViewChange={changeView} />
        <CompanyContent>
          <CompanyRuntimeContent company={company} view={view} setView={changeView} />
        </CompanyContent>
      </section>
    </main>
  )
}
