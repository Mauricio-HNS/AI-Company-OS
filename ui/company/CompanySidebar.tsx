'use client'

import Link from 'next/link'
import { Building2, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { companyNavigation, type CompanyView } from './company-navigation'
import styles from './CompanySidebar.module.css'

type CompanySummary = { name: string; type: string; agents: number }

export default function CompanySidebar({ company, view, collapsed, onViewChange, onToggle }: { company: CompanySummary; view: CompanyView; collapsed: boolean; onViewChange: (view: CompanyView) => void; onToggle: () => void }) {
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}><div className={styles.brandMark}>AI</div><div className={styles.brandCopy}><b>AI COMPANY OS</b><small>COMPANY OPERATING SYSTEM</small></div></div>
      <div className={styles.companyPicker}><div className={styles.companyAvatar}>{company.name.slice(0, 1)}</div><div className={styles.companyCopy}><small>COMPANY</small><b>{company.name}</b><span>{company.type}</span></div><ChevronDown size={14}/></div>
      <nav className={styles.nav} aria-label="Company navigation">
        {companyNavigation.map((group, index) => <div className={styles.navGroup} key={group.title || index}>{group.title && <small>{group.title}</small>}{group.items.map(({ label, icon: Icon, badge }) => <button key={label} type="button" className={view === label ? styles.active : ''} onClick={() => onViewChange(label)} aria-current={view === label ? 'page' : undefined}><Icon size={17}/><span>{label}</span>{badge === 'agents' && <em>{company.agents}</em>}</button>)}</div>)}
      </nav>
      <div className={styles.sidebarBottom}><div className={styles.system}><i/>Simulation runtime online</div><Link href="/master"><Building2 size={15}/>Portfolio</Link><button type="button" onClick={onToggle}>{collapsed ? <PanelLeftOpen size={16}/> : <PanelLeftClose size={16}/>}<span>{collapsed ? 'Expand menu' : 'Collapse menu'}</span></button></div>
    </aside>
  )
}
