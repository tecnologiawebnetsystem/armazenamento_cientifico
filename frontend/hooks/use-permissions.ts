import type { PermissionMatrixEntry, Role, ShareLevel } from "@/lib/types"

/**
 * Modelo de permissões em dois níveis:
 *
 * 1. Papel no projeto (admin/gerente/patrocinador/auditor) definido pelo
 *    administrador — controla ações estruturais (criar, excluir, gerenciar
 *    membros, aprovar solicitações).
 * 2. Compartilhamento por pasta/arquivo (leitura/edição/proprietário) —
 *    refina o que cada membro pode fazer dentro do que o papel já permite.
 */
export const roleCapabilities = {
  admin: ["read", "create", "update", "delete", "manage_users", "manage_members", "approve_access", "revoke_access", "audit", "reports", "access_map", "all_projects", "all_folders"],
  gerente: ["read", "approve_access", "revoke_access", "access_map", "project_scope", "folder_scope"],
  patrocinador: ["read", "audit", "reports", "access_map", "all_projects", "all_folders"],
  auditor: ["read", "audit"],
  solicitante: ["read", "project_scope", "folder_scope"],
} as const

export type Capability = (typeof roleCapabilities)[keyof typeof roleCapabilities][number]

export function hasCapability(role: Role | string | null | undefined, capability: Capability) {
  const normalized = normalizeRole(role)
  return (roleCapabilities[normalized as keyof typeof roleCapabilities] ?? []).includes(capability as never)
}

export function normalizeRole(role: Role | string | null | undefined): keyof typeof roleCapabilities {
  const aliases: Record<string, keyof typeof roleCapabilities> = {
    administrador: "admin", administrator: "admin", gestor: "gerente", manager: "gerente",
    participante: "solicitante", visualizador: "auditor", viewer: "auditor", sponsor: "patrocinador", requester: "solicitante",
  }
  const value = String(role ?? "solicitante").toLowerCase()
  return aliases[value] ?? (value in roleCapabilities ? value as keyof typeof roleCapabilities : "solicitante")
}

export function getRolePermissions(role: Role, matrix: PermissionMatrixEntry[]) {
  return matrix.find((m) => m.papel === normalizeRole(role)) ?? matrix[matrix.length - 1]
}

export function canEditFile(projectRole: Role, _shareLevel: ShareLevel | null) {
  if (projectRole === "admin") return true
  return false
}

export function shareLevelLabel(level: ShareLevel) {
  switch (level) {
    case "leitura":
      return "Somente leitura"
    case "edicao":
      return "Pode editar"
    case "proprietario":
      return "Proprietário"
  }
}

export function roleLabel(role: Role | string | null | undefined) {
  switch (String(role ?? "").toLowerCase()) {
    case "admin":
    case "administrador":
    case "administrator":
      return "Administrador"
    case "gerente":
    case "gestor":
    case "manager":
      return "Gerente"
    case "patrocinador":
    case "sponsor":
      return "Patrocinador"
    case "auditor":
    case "audit":
      return "Auditor"
    case "solicitante":
    case "requester":
      return "Solicitante"
    case "participante":
    case "participant":
      return "Participante"
    case "visualizador":
    case "visualizador_leitura":
    case "viewer":
      return "Visualizador"
    default:
      return String(role ?? "Permissão não informada")
  }
}

/** Descrição curta de cada perfil, usada em selects e telas administrativas. */
export function roleDescription(role: Role) {
  switch (role) {
    case "admin":
      return "Governança total da plataforma, usuários e parâmetros."
    case "gerente":
      return "Aprova ou revoga acessos e consulta apenas seu escopo."
    case "patrocinador":
      return "Consulta projetos, relatórios, logs e mapas de acessos."
    case "auditor":
      return "Somente leitura, com acesso à trilha de auditoria."
    case "solicitante":
      return "Visualiza somente projetos e pastas autorizados."
  }
}

/** Todos os perfis disponíveis, na ordem hierárquica de exibição. */
export const allRoles: Role[] = ["admin", "patrocinador", "auditor", "gerente", "solicitante"]
