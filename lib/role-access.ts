function normalizeAccessRole(role: string | null | undefined): string {
  const aliases: Record<string, string> = { administrador: "admin", administrator: "admin", manager: "gerente", sponsor: "patrocinador", viewer: "auditor", operator: "operador", opr: "operador" }
  const value = String(role ?? "").trim().toLowerCase()
  return aliases[value] ?? value
}

const roleRoutes: Record<string, string[]> = {
  admin: ["/dashboard", "/projetos", "/pesquisas", "/logs", "/relatorios"],
  gerente: ["/dashboard", "/projetos", "/pesquisas", "/relatorios"],
  patrocinador: ["/dashboard", "/projetos", "/pesquisas", "/relatorios"],
  auditor: ["/logs"],
  operador: ["/configuracoes"],
}

export function canAccessRoute(role: string | null | undefined, pathname: string): boolean {
  const normalizedPath = pathname.replace(/\/$/, "") || "/"
  const allowedRoutes = roleRoutes[normalizeAccessRole(role)] ?? []
  return allowedRoutes.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`))
}

export function isOperatorRole(role?: string | null, profileId?: string | null, profileName?: string | null): boolean {
  const normalized = [role, profileName].map((value) => String(value ?? "").trim().toLowerCase())
  return profileId?.trim().toUpperCase() === "OPR" || normalized.some((value) => value === "operador" || value === "operator" || value === "opr")
}
