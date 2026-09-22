'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { CompanySession } from '../../../lib/company-access-control'
import { companyViews, type CompanyView } from '../../../ui/company/CompanyNavigation'
import CompanySidebar from '../../../ui/company/CompanySidebar'
import CompanyTopbar from '../../../ui/company/CompanyTopbar'
import styles from './CompanyRuntimeWorkspaceV2.module.css'

type Company = {
  name: string
  type: string
  agents: number
}

function viewFromPath(pathname: string, companyId: string): CompanyView {
  const prefix = `/company/${companyId}`
  const segment = pathname.slice(prefix.length).split('/').filter(Boolean)[0]
  if (!segment) return 'Dashboard'

  const map: Partial<Record<string, CompanyView>> = {
    agents: 'Agents',
    marketing: 'Marketing',
    operations: 'Operations',
    schedule: 'Operations',
    intelligence: 'Intelligence',
    settings: 'Settings',
  }

  return map[segment] ?? 'Dashboard'
}

function pathForView(companyId: string, view: CompanyView): string {
  const map: Record<CompanyView, string> = {
    Dashboard: '',
    Agents: 'agents',
    Marketing: 'marketing',
    Operations: 'operations',
    Intelligence: 'intelligence',
    Settings: 'settings',
  }
  return `/company/${companyId}${map[view] ? `/${map[view]}` : ''}`
}

export default function CompanyRouteShell({ company, companyId, children }: {
  company: Company
  companyId: string
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [session, setSession] = useState<CompanySession | null>(null)
  const view = viewFromPath(pathname, companyId)

  useEffect(() => {
    const raw = sessionStorage.getItem(`company-session:${companyId}`)
    if (!raw) return
    try { setSession(JSON.parse(raw)) } catch { setSession(null) }
  }, [companyId])

  function navigate(nextView: CompanyView) {
    if (!companyViews.includes(nextView)) return
    setProfileOpen(false)
    router.push(pathForView(companyId, nextView))
  }

  return (
    <main className={`${styles.workspace} ${collapsed ? styles.collapsed : ''}`}>
      <CompanySidebar
        company={company}
        view={view}
        collapsed={collapsed}
        onViewChange={navigate}
        onToggle={() => setCollapsed(value => !value)}
      />
      <section className={styles.main}>
        <CompanyTopbar
          companyName={company.name}
          companyId={companyId}
          session={session}
          profileOpen={profileOpen}
          onProfileToggle={() => setProfileOpen(value => !value)}
          onViewChange={navigate}
        />
        {children}
      </section>
    </main>
  )
}
