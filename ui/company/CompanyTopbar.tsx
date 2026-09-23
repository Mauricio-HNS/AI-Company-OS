'use client'

import { useRouter } from 'next/navigation'
import { Bell, Building2, ChevronDown, ChevronRight, Search, Settings, ShieldCheck, UserRound } from 'lucide-react'
import type { CompanyView } from './company-navigation'
import styles from './CompanyTopbar.module.css'

type SessionSummary = {
  displayName?: string
  role?: string
}

export default function CompanyTopbar({
  companyName,
  companyId,
  session,
  profileOpen,
  onProfileToggle,
  onViewChange,
}: {
  companyName: string
  companyId: string
  session: SessionSummary | null
  profileOpen: boolean
  onProfileToggle: () => void
  onViewChange?: (view: CompanyView) => void
}) {
  const router = useRouter()
  const name = session?.displayName || 'Maurício Henrique'
  const role = session?.role || 'Administrator'

  function logout() {
    sessionStorage.removeItem(`company-session:${companyId}`)
    router.push('/login')
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.crumb}>
        <span>AI COMPANY OS</span>
        <ChevronRight size={13} />
        <b>{companyName}</b>
      </div>
      <div className={styles.actions}>
        <button type="button" aria-label="Search"><Search size={17} /></button>
        <button type="button" aria-label="Notifications"><Bell size={17} /><i /></button>
        <div className={styles.profileWrap}>
          <button type="button" className={styles.user} onClick={onProfileToggle} aria-expanded={profileOpen}>
            <div>MH</div>
            <span><b>{name}</b><small>{role}</small></span>
            <ChevronDown size={14} />
          </button>
          {profileOpen && (
            <div className={styles.profileMenu}>
              <b>{name}</b>
              <small>{role}</small>
              <button type="button" onClick={() => onViewChange?.('Settings')}><UserRound size={14} />My Profile</button>
              <button type="button" onClick={() => onViewChange?.('Settings')}><Settings size={14} />Preferences</button>
              <button type="button" onClick={() => onViewChange?.('Security')}><ShieldCheck size={14} />Security</button>
              <hr />
              <button type="button" onClick={() => router.push('/master')}><Building2 size={14} />Switch Company</button>
              <hr />
              <button type="button" onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
