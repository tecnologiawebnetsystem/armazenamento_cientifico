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
export function getRolePermissions(role: Role, matrix: PermissionMatrixEntry[]) {
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
      return "Conduz o projeto: membros, arquivos e compartilhamentos."
    case "patrocinador":
      return "Acompanha resultados e aprova solicitações de acesso."
    case "auditor":
      return "Somente leitura, com acesso à trilha de auditoria."
    case "solicitante":
      return "Solicita acessos e acompanha o andamento das solicitações."
    case "participante":
      return "Participa do projeto conforme os acessos concedidos."
    case "visualizador":
      return "Consulta informações sem editar."
    case "gestor":
      return "Gestão operacional do projeto."
  }
}

/** Todos os perfis disponíveis, na ordem hierárquica de exibição. */
export const allRoles: Role[] = ["admin", "patrocinador", "auditor", "gerente", "solicitante"]
