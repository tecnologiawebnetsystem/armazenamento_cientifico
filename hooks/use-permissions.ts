import type { PermissionMatrixEntry, Role, ShareLevel } from "@/lib/types"
import { defaultPermissionMatrix } from "@/lib/mock-data"

/**
 * Modelo de permissões em dois níveis:
 *
 * 1. Papel no projeto (admin/gerente/patrocinador/auditor) definido pelo
 *    administrador — controla ações estruturais (criar, excluir, gerenciar
 *    membros, aprovar solicitações).
 * 2. Compartilhamento por pasta/arquivo (leitura/edição/proprietário) —
 *    refina o que cada membro pode fazer dentro do que o papel já permite.
 */
export function getRolePermissions(role: Role, matrix: PermissionMatrixEntry[] = defaultPermissionMatrix) {
  return matrix.find((m) => m.papel === role) ?? matrix[matrix.length - 1]
}

export function canEditFile(projectRole: Role, shareLevel: ShareLevel | null) {
  if (projectRole === "admin" || projectRole === "gerente") return true
  if (projectRole === "auditor") return false
  if (!shareLevel) return true
  return shareLevel === "edicao" || shareLevel === "proprietario"
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

export function roleLabel(role: Role) {
  switch (role) {
    case "admin":
      return "Administrador"
    case "gerente":
      return "Gerente do Projeto"
    case "patrocinador":
      return "Patrocinador"
    case "auditor":
      return "Auditor"
  }
}

/** Descrição curta de cada perfil, usada em selects e telas administrativas. */
export function roleDescription(role: Role) {
  switch (role) {
    case "admin":
      return "Governança total da plataforma, usuários e parâmetros."
    case "gerente":
      return "Conduz o projeto: membros, arquivos e compartilhamentos."
    case "patrocinador":
      return "Acompanha resultados e aprova solicitações de acesso."
    case "auditor":
      return "Somente leitura, com acesso à trilha de auditoria."
  }
}

/** Todos os perfis disponíveis, na ordem hierárquica de exibição. */
export const allRoles: Role[] = ["admin", "patrocinador", "gerente", "auditor"]
