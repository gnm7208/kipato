import { BarChart3, FileText, Home, MessageSquareText, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

export const workerTabs: NavItem[] = [
  { label: 'Home', to: '/app', icon: Home },
  { label: 'Trends', to: '/app/trends', icon: BarChart3 },
  { label: 'Imports', to: '/app/imports', icon: MessageSquareText },
  { label: 'Statements', to: '/app/statements', icon: FileText },
]

export const adminTabs: NavItem[] = [
  { label: 'Overview', to: '/admin', icon: Home },
  { label: 'Workers', to: '/admin/workers', icon: Users },
]
