import type { PermissionMatrixEntry, Role, ShareLevel } from "@/lib/types"
import { defaultPermissionMatrix } from "@/lib/mock-data"

/**
 * Modelo de permissões em dois níveis:
 *
 * 1. Papel no projeto (admin/gestor/participante/visualizador) definido pelo
 *    administrador — controla ações estruturais (criar, excluir, gerenciar
 *    membros, aprovar solicitações).
 * 2. Compartilhamento por pasta/arquivo (leitura/edição/proprietário) —
 *    refina o que cada membro pode fazer dentro do que o papel já permite.
 */
export function getRolePermissions(role: Role, matrix: PermissionMatrixEntry[] = defaultPermissionMatrix) {
  return matrix.find((m) => m.papel === role) ?? matrix[matrix.length - 1]
}

export function canEditFile(projectRole: Role, shareLevel: ShareLevel | null) {
  if (projectRole === "admin" || projectRole === "gestor") return true
  if (projectRole === "visualizador") return false
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
    case "gestor":
      return "Gestor"
    case "participante":
      return "Participante"
    case "visualizador":
      return "Visualizador"
  }
}
