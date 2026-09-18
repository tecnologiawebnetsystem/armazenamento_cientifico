import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  FlaskConicalIcon,
  BarChart3Icon,
  ClipboardListIcon,
  type LucideIcon,
} from "lucide-react"
import type { Role } from "@/lib/types"
import { normalizeRole } from "@/hooks/use-permissions"

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  /** Papéis que podem ver este item. Vazio = todos os papéis autenticados. */
  roles?: Role[]
  children?: NavItem[]
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
        title: "Relatórios",
        url: "/relatorios",
        icon: BarChart3Icon,
        roles: ["admin", "patrocinador", "gerente"],
        children: [
          { title: "Relatório de projetos", url: "/relatorios", icon: BarChart3Icon },
          { title: "Mapa de acessos", url: "/pesquisas", icon: FlaskConicalIcon },
        ],
      },
      {
        title: "Consulta de logs",
        url: "/logs",
        icon: ClipboardListIcon,
        roles: ["admin", "auditor"],
      },
    ],
  },
  {
    label: "Administração",
    items: [
    ],
  },
]

export function filterNavForRole(groups: NavGroup[], role: Role): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => !item.roles || item.roles.includes(normalizeRole(role) as Role))
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => !child.roles || child.roles.includes(normalizeRole(role) as Role)),
        }))
        .filter((item) => !item.children || item.children.length > 0),
    }))
    .filter((group) => group.items.length > 0)
}
