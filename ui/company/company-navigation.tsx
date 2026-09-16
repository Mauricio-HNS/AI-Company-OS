import type { ComponentType } from 'react'
import { Activity, BrainCircuit, Bot, LayoutDashboard, Megaphone, Package, PlugZap, Settings, ShieldCheck, Target, Users, Wallet, Zap } from 'lucide-react'

export type CompanyView = 'Dashboard'|'Agents'|'Missions'|'Tasks'|'Marketing'|'Customers'|'Products'|'Finance'|'Intelligence'|'Knowledge'|'Operations'|'Integrations'|'Security'|'Settings'
export type NavigationItem = { label: CompanyView; icon: ComponentType<{ size?: number }> }
export type NavigationGroup = { title: string; items: NavigationItem[] }

export const companyNavigation: NavigationGroup[] = [
  { title: '', items: [{ label: 'Dashboard', icon: LayoutDashboard }] },
  { title: 'AI WORKFORCE', items: [{ label: 'Agents', icon: Bot }, { label: 'Missions', icon: Target }, { label: 'Tasks', icon: Zap }] },
  { title: 'BUSINESS', items: [{ label: 'Marketing', icon: Megaphone }, { label: 'Customers', icon: Users }, { label: 'Products', icon: Package }, { label: 'Finance', icon: Wallet }] },
  { title: 'INTELLIGENCE', items: [{ label: 'Intelligence', icon: Activity }, { label: 'Knowledge', icon: BrainCircuit }] },
  { title: 'SYSTEM', items: [{ label: 'Operations', icon: PlugZap }, { label: 'Integrations', icon: PlugZap }, { label: 'Security', icon: ShieldCheck }, { label: 'Settings', icon: Settings }] },
]
