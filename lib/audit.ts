import type { ActivityAction } from "@/lib/types"

export const AUDIT_ACTIONS = {
  LOGIN: "login",
  LOGOUT: "logout",
  LOGIN_FAILED: "login-falha",
  SESSION_EXPIRED: "sessao-expirada",
  PASSWORD_CHANGED: "alterar-senha",
  PROJECT_CREATED: "criar-projeto",
  PROJECT_UPDATED: "editar-projeto",
  PROJECT_DELETED: "excluir-projeto",
  PROJECT_ACTIVATED: "ativar-projeto",
  PROJECT_PAUSED: "pausar-projeto",
  RESPONSIBLE_UPDATED: "alterar-responsaveis",
  SYNC_STARTED: "sincronizacao-inicio",
  SYNC_SUCCEEDED: "sincronizacao-sucesso",
  SYNC_FAILED: "sincronizacao-falha",
  FOLDER_READ: "ler-pasta",
  FILE_UPLOADED: "upload-arquivo",
  FILE_DOWNLOADED: "download-arquivo",
  FILE_DELETED: "excluir-arquivo",
  FOLDER_SIZE_UPDATED: "alterar-tamanho-pasta",
  ACCESS_MAP_VIEWED: "consultar-mapa-acessos",
  ACCESS_GRANTED: "conceder-acesso",
  ACCESS_REVOKED: "remover-acesso",
  ACCESS_UPDATED: "alterar-permissoes",
  GROUP_CREATED: "criar-grupo",
  GROUP_MEMBERS_UPDATED: "alterar-membros-grupo",
  GROUP_PERMISSIONS_UPDATED: "alterar-permissoes-grupo",
  REPORT_GENERATED: "gerar-relatorio",
  REPORT_EXPORTED: "exportar-relatorio",
  REPORT_DOWNLOADED: "download-relatorio",
  SETTINGS_UPDATED: "alterar-configuracoes",
  ACCESS_DENIED: "acesso-negado",
  INVALID_ATTEMPT: "tentativa-invalida",
  ADMIN_ACTION: "acao-administrativa",
  NETWORK_ERROR: "erro-rede",
  TIMEOUT: "timeout",
  FOLDER_UNAVAILABLE: "pasta-indisponivel",
  DATABASE_ERROR: "erro-banco",
  INTEGRATION_ERROR: "erro-integracao",
} as const satisfies Record<string, ActivityAction>

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

export function auditDetails(details: Record<string, unknown> = {}) {
  return {
    ...details,
    horario_cliente: new Date().toISOString(),
  }
}
