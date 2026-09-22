import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BrainCircuit,
  Bot,
  LayoutDashboard,
  Megaphone,
  Settings,
} from 'lucide-react'

export const companyViews = [
  'Dashboard',
  'Agents',
  'Marketing',
  'Operations',
  'Intelligence',
  'Settings',
] as const

export type CompanyView = (typeof companyViews)[number]

export type CompanyNavigationItem = {
  label: CompanyView
  icon: LucideIcon
  badge?: 'agents'
}

export type CompanyNavigationGroup = {
  title: string
  items: CompanyNavigationItem[]
}

export const companyNavigation: CompanyNavigationGroup[] = [
  { title: '', items: [{ label: 'Dashboard', icon: LayoutDashboard }] },
  { title: 'AI WORKFORCE', items: [{ label: 'Agents', icon: Bot, badge: 'agents' }] },
  { title: 'BUSINESS', items: [{ label: 'Marketing', icon: Megaphone }] },
  { title: 'OPERATIONS', items: [{ label: 'Operations', icon: Activity }] },
  { title: 'INTELLIGENCE', items: [{ label: 'Intelligence', icon: BrainCircuit }] },
  { title: 'SYSTEM', items: [{ label: 'Settings', icon: Settings }] },
]

export function isCompanyView(value: string): value is CompanyView {
  return companyViews.includes(value as CompanyView)
}
