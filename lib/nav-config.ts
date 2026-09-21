import type { LucideIcon } from "lucide-react"

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  children?: NavItem[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** Metadados técnicos locais; autorização e conteúdo vêm do contexto do backend. */
export const navGroups: NavGroup[] = []
