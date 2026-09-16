import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BrainCircuit,
  Bot,
  LayoutDashboard,
  Megaphone,
  Package,
  PlugZap,
  Settings,
  ShieldCheck,
  Target,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'

export const companyViews = [
  'Dashboard',
  'Agents',
  'Missions',
  'Tasks',
  'Marketing',
  'Customers',
  'Products',
  'Finance',
  'Intelligence',
  'Knowledge',
  'Operations',
  'Integrations',
  'Security',
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
  {
    title: '',
    items: [{ label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'AI WORKFORCE',
    items: [
      { label: 'Agents', icon: Bot, badge: 'agents' },
      { label: 'Missions', icon: Target },
      { label: 'Tasks', icon: Zap },
    ],
  },
  {
    title: 'BUSINESS',
    items: [
      { label: 'Marketing', icon: Megaphone },
      { label: 'Customers', icon: Users },
      { label: 'Products', icon: Package },
      { label: 'Finance', icon: Wallet },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { label: 'Intelligence', icon: Activity },
      { label: 'Knowledge', icon: BrainCircuit },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Operations', icon: Activity },
      { label: 'Integrations', icon: PlugZap },
      { label: 'Security', icon: ShieldCheck },
      { label: 'Settings', icon: Settings },
    ],
  },
]

export function isCompanyView(value: string): value is CompanyView {
  return companyViews.includes(value as CompanyView)
}
