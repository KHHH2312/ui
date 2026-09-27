import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Boxes,
  Database,
  Settings,
  Users,
  Factory,
  Headset,
  LayoutDashboard,
  Network,
  Server,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Warehouse,
} from 'lucide-react'

export type ModuleId =
  | 'inventory'
  | 'transportation'
  | 'warehousing'
  | 'manufacturing'
  | 'procurement'
  | 'distribution'
  | 'crm'
  | 'it'

export type WorkspacePageId = 'knowledge' | 'data' | 'team' | 'settings'

export type ViewId = 'dashboard' | 'triage' | ModuleId | WorkspacePageId

export interface NavItem {
  id: ViewId
  label: string
  icon: LucideIcon
  hint: string
}

export const PRIMARY_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Fleet Dashboard', icon: LayoutDashboard, hint: 'Executive fleet health overview' },
  { id: 'triage', label: 'Autonomous Triage', icon: ShieldCheck, hint: 'AI triage & mitigation cockpit' },
]

export const MODULE_NAV: Array<NavItem & { id: ModuleId }> = [
  { id: 'manufacturing', label: 'Manufacturing', icon: Factory, hint: 'Lines, OEE, machinery health' },
  { id: 'inventory', label: 'Inventory', icon: Boxes, hint: 'Stock, spares, reorder points' },
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart, hint: 'Purchase orders & suppliers' },
  { id: 'warehousing', label: 'Warehousing', icon: Warehouse, hint: 'Zones, docks, pick rates' },
  { id: 'distribution', label: 'Distribution', icon: Network, hint: 'DC network & fulfilment' },
  { id: 'transportation', label: 'Transportation', icon: Truck, hint: 'Shipments & carriers' },
  { id: 'crm', label: 'Customer Service / CRM', icon: Headset, hint: 'Cases, SLAs, accounts' },
  { id: 'it', label: 'Information Technology', icon: Server, hint: 'OT/IT services & integrations' },
]

export const WORKSPACE_NAV: Array<NavItem & { id: WorkspacePageId }> = [
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, hint: 'Documents indexed for RAG' },
  { id: 'data', label: 'Data & Pipelines', icon: Database, hint: 'Sources, Bronze → Silver → Gold' },
  { id: 'team', label: 'Team', icon: Users, hint: 'Members, roles, module access' },
  { id: 'settings', label: 'Company Settings', icon: Settings, hint: 'Profile, modules, audit' },
]

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...MODULE_NAV, ...WORKSPACE_NAV]

export const MODULE_IDS: ModuleId[] = MODULE_NAV.map((m) => m.id)

export const isModuleId = (v: string): v is ModuleId => (MODULE_IDS as string[]).includes(v)

export const navItem = (id: ViewId): NavItem => ALL_NAV.find((n) => n.id === id) ?? PRIMARY_NAV[0]

export const isViewId = (v: string): v is ViewId => ALL_NAV.some((n) => n.id === v)
