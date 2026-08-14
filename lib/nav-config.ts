import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  UsersIcon,
  ClipboardListIcon,
  SlidersHorizontalIcon,
  SendIcon,
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
    ],
  },
  {
    label: "Conta",
    items: [
      { title: "Meu perfil", url: "/perfil", icon: UserCircleIcon },
      { title: "Solicitar acesso", url: "/solicitar-acesso", icon: SendIcon },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "Usuários", url: "/administracao/usuarios", icon: UsersIcon, roles: ["admin"] },
      {
        title: "Fila de solicitações",
        url: "/administracao/solicitacoes",
        icon: ClipboardListIcon,
        roles: ["admin"],
      },
      {
        title: "Matriz de permissões",
        url: "/administracao/permissoes",
        icon: ShieldCheckIcon,
        roles: ["admin"],
      },
      { title: "Parâmetros", url: "/administracao/parametros", icon: SlidersHorizontalIcon, roles: ["admin"] },
    ],
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
