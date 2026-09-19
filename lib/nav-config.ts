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
  permissions?: string[]
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
      { title: "Projetos", url: "/projetos", icon: FolderKanbanIcon, permissions: ["projeto.visualizar", "read"] },
      {
        title: "Relatórios",
        url: "/relatorios",
        icon: BarChart3Icon,
        roles: ["admin", "patrocinador", "gerente"],
        permissions: ["relatorio.exportar", "reports"],
        children: [
          { title: "Relatório de projetos", url: "/relatorios", icon: BarChart3Icon },
          { title: "Mapa de acessos", url: "/pesquisas", icon: FlaskConicalIcon },
        ],
      },
      {
        title: "Logs e Auditoria",
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

export function filterNavForRole(groups: NavGroup[], role: Role, permissions: string[] = []): NavGroup[] {
  const normalizedRole = normalizeRole(role) as Role
  const canSee = (item: NavItem) => {
    const roleAllowed = !item.roles || item.roles.includes(normalizedRole)
    const permissionAllowed = !item.permissions || item.permissions.some((permission) => permissions.includes(permission))
    return roleAllowed && permissionAllowed
  }
  const filterItems = (items: NavItem[]): NavItem[] => items
    .filter(canSee)
    .map((item) => ({ ...item, children: item.children ? filterItems(item.children) : undefined }))
    .filter((item) => !item.children || item.children.length > 0)
  return groups.map((group) => ({ ...group, items: filterItems(group.items) })).filter((group) => group.items.length > 0)
}
