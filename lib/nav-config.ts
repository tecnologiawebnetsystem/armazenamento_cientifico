import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  FlaskConicalIcon,
  HistoryIcon,
  BarChart3Icon,
  type LucideIcon,
} from "lucide-react"
import type { Role } from "@/lib/types"

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  /** Papéis que podem ver este item. Vazio = todos os papéis autenticados. */
  roles?: Role[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Menu dinâmico: cada item declara quais papéis globais podem vê-lo.
 * A sidebar filtra este array de acordo com o `role` do usuário logado.
 */
export const navGroups: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
      { title: "Projetos", url: "/projetos", icon: FolderKanbanIcon },
      {
        title: "Pesquisas",
        url: "/pesquisas",
        icon: FlaskConicalIcon,
        roles: ["admin", "patrocinador", "gerente", "auditor"],
      },
      {
        title: "Consultas e relatórios",
        url: "/relatorios",
        icon: BarChart3Icon,
        roles: ["admin", "patrocinador", "gerente"],
      },
    ],
  },
  {
    label: "Administração",
    items: [{ title: "Logs de auditoria", url: "/logs", icon: HistoryIcon, roles: ["admin", "auditor"] }],
  },
]

export function filterNavForRole(groups: NavGroup[], role: Role): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
}
