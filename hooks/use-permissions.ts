import { usePlatformContext } from "@/hooks/use-platform-context"
import type { Role } from "@/lib/types"

export type Capability = string

export function normalizeRole(role: Role | string | null | undefined): string {
  const aliases: Record<string, string> = {
    administrador: "admin",
    administrator: "admin",
    manager: "gerente",
    viewer: "auditor",
    sponsor: "patrocinador",
    requester: "solicitante",
  }
  const value = String(role ?? "").trim().toLowerCase()
  return aliases[value] ?? value
}

export function isMenuAllowedForRole(role: Role | string | null | undefined, route: string): boolean {
  const normalized = normalizeRole(role)
  const path = route.replace(/\/$/, "") || "/"
  if (normalized === "admin") return true
  if (normalized === "gerente") return path !== "/configuracoes"
  if (normalized === "patrocinador") return path === "/projetos" || path.startsWith("/projetos/")
  if (normalized === "auditor") return path === "/auditoria" || path.startsWith("/auditoria/") || path === "/logs" || path.startsWith("/logs/")
  return false
}

export function hasCapability(permissions: string[] | undefined, capability: Capability): boolean {
  return Boolean(permissions?.includes(capability))
}

export function hasEffectiveCapability(permissions: string[] | undefined, capability: Capability): boolean {
  return hasCapability(permissions, capability)
}

export function usePermissions() {
  const context = usePlatformContext()
  const permissions = context.data?.permissions ?? []

  return {
    ...context,
    permissions,
    role: context.data?.user?.perfil_nome ? normalizeRole(context.data.user.perfil_nome) : null,
    hasCapability: (capability: Capability) => hasCapability(permissions, capability),
  }
}

export function roleLabel(role: Role | string | null | undefined) {
  switch (normalizeRole(role)) {
    case "admin": return "Administrador"
    case "gerente": return "Gerente"
    case "patrocinador": return "Patrocinador"
    case "auditor": return "Auditor"
    case "solicitante": return "Solicitante"
    default: return String(role ?? "Permissão não informada")
  }
}

export function roleDescription(role: Role) {
  switch (normalizeRole(role)) {
    case "admin": return "Governança total da plataforma, usuários e parâmetros."
    case "gerente": return "Aprova ou revoga acessos e consulta apenas seu escopo."
    case "patrocinador": return "Consulta projetos, relatórios, logs e mapas de acessos."
    case "auditor": return "Somente leitura, com acesso à trilha de auditoria."
    case "solicitante": return "Não possui acesso ao SIGAC."
    default: return ""
  }
}

export const allRoles: Role[] = ["admin", "patrocinador", "auditor", "gerente", "solicitante"]

export function useCan(capability: Capability) {
  const { hasCapability } = usePermissions()
  return hasCapability(capability)
}

export function Can({ capability, children }: { capability: Capability; children: React.ReactNode }) {
  const allowed = useCan(capability)
  return allowed ? children : null
}
