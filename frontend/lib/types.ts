/**
 * Tipos de domínio da Plataforma de Armazenamento Científico.
 *
 * Estes tipos espelham o contrato persistente implementado pelo backend FastAPI
 * e consumido pelo frontend através do cliente HTTP único.
 */

/**
 * Perfis de acesso da plataforma:
 * - `admin`        → Administrador (governança total da plataforma)
 * - `gerente`      → Gerente do Projeto (conduz o projeto no dia a dia)
 * - `patrocinador` → Patrocinador (aprova acessos e acompanha resultados)
 * - `auditor`      → Auditor (somente leitura + trilha de auditoria)
 */
export type Role = "admin" | "gerente" | "patrocinador" | "auditor" | "participante" | "visualizador" | "gestor"

/** Papel global ou de participação dentro de um projeto. */
export type ProjectMemberRole = Role

export type ShareLevel = "leitura" | "edicao" | "proprietario"

export type AccessRequestStatus = "pendente" | "aprovado" | "negado"

export type ProjectStatus = "ativo" | "concluido" | "suspenso" | "inativo" | "em_andamento"

export interface User {
  id: string
  nome: string
  email: string
  cargo: string
  area: string
  avatarUrl?: string
  /** Papel global do usuário na plataforma (independe do papel por projeto). */
  role: Role
  perfilId?: string
  criadoEm: string
}

export interface ProjectMember {
  projectId: string
  userId: string
  papel: ProjectMemberRole
  adicionadoEm: string
}

export interface Project {
  /** Chave técnica interna (surrogate key). */
  id: string
  nome: string
  /** Código/identificador único de negócio informado no cadastro. */
  codigo: string
  /** Área (gerência) responsável pelo projeto. */
  areaResponsavel: string
  /** Gestores do projeto — um projeto pode ter mais de um gerente. */
  gestoresIds: string[]
  /** Grupo do Azure AD com permissão de escrita. */
  grupoAdEscrita: string
  /** Grupo do Azure AD com permissão de leitura. */
  grupoAdLeitura: string
  /** Role do Identidade com permissão de escrita. */
  roleIdentidadeEscrita: string
  /** Role do Identidade com permissão de leitura. */
  roleIdentidadeLeitura: string
  /** Número da tarefa do ServiceNow (Snow) que originou a demanda. */
  numeroTarefaSnow: string
  /** Nome da pasta mãe do projeto no repositório de arquivos. */
  pastaMae: string
  descricao: string
  status: ProjectStatus
  /** Data de criação do projeto (informada no cadastro). */
  criadoEm: string
  atualizadoEm: string
  /** Preenchido pela API a partir de ProjectMember. */
  participantesIds?: string[]
  armazenamentoUsadoMb?: number
}

export interface ShareEntry {
  id: string
  userId: string
  nivel: ShareLevel
  compartilhadoEm: string
}

export interface FileNode {
  id: string
  projectId: string
  parentId: string | null
  tipo: "pasta" | "arquivo"
  nome: string
  tamanho?: number
  mimeType?: string
  criadoPor: string
  criadoEm: string
  atualizadoEm: string
  compartilhamentos: ShareEntry[]
}

export interface AccessRequest {
  id: string
  usuarioId: string
  projetoId: string
  tipo: "novo-acesso" | "alteracao-permissao"
  papelSolicitado: Role
  justificativa: string
  numeroChamadoServiceNow: string
  status: AccessRequestStatus
  criadoEm: string
  atualizadoEm: string
  analisadoPor?: string
}

/** Matriz de alçadas: o que cada papel pode fazer por padrão na plataforma. */
export interface PermissionMatrixEntry {
  papel: Role
  verProjetos: boolean
  criarProjetos: boolean
  editarProjeto: boolean
  excluirProjeto: boolean
  gerenciarMembros: boolean
  uploadArquivos: boolean
  excluirArquivos: boolean
  compartilharArquivos: boolean
  aprovarSolicitacoes: boolean
}

export type SessionUser = User

/** Parâmetros administráveis da plataforma (administração > parâmetros). */
export interface PlatformSettings {
  areasOrganizacionais: string[]
  cotaArmazenamentoPadraoMb: number
  diasExpiracaoSolicitacaoAcesso: number
  mensagemAvisoAmbiente: string
}

/** Ação registrada na trilha de auditoria da plataforma. */
export type ActivityAction =
  | "login"
  | "logout"
  | "criar-projeto"
  | "editar-projeto"
  | "excluir-projeto"
  | "adicionar-membro"
  | "atualizar-membro"
  | "remover-membro"
  | "criar-pasta"
  | "enviar-arquivo"
  | "renomear-item"
  | "mover-item"
  | "excluir-item"
  | "compartilhar-item"
  | "remover-compartilhamento"
  | "criar-solicitacao-acesso"
  | "aprovar-solicitacao"
  | "negar-solicitacao"
  | "atualizar-papel-usuario"
  | "atualizar-matriz-permissoes"
  | "atualizar-parametros"
  | "consultar-mapa-acessos"
  | "exportar-logs"
  | "exportar-relatorio"

export interface ActivityLog {
  id: string
  userId: string
  acao: ActivityAction
  entidade: string
  entidadeId: string
  detalhes: string
  criadoEm: string
  resultado?: "sucesso" | "erro"
  projetoId?: string
  correlationId?: string
}

export interface AccessMapRow {
  userId: string
  userName: string
  userEmail: string
  userRole: Role
  area: string
  projectId: string
  projectName: string
  projectStatus: ProjectStatus
  resourceId: string
  resourceName: string
  resourceType: "pasta" | "arquivo"
  accessLevel: ShareLevel | ProjectMemberRole
  lastViewedAt: string
}

export interface ProjectAccessMapGroup {
  nome: string
  fonte: string
  identificadores: string[]
  nivel: string
}

export interface ProjectAccessMapResponse {
  projectId: string
  groups: ProjectAccessMapGroup[]
  members: (ProjectMember & { user: User })[]
  source: string
  consultedAt: string
}

export interface DashboardSummary {
  projects: Project[]
  totalMembros: number
  totalMapas: number
  armazenamentoMb: number
  pendencias: number
  activity: ActivityLog[]
  source: "database"
  consultedAt: string
}

export interface AccessMapResponse {
  summary: {
    users: number
    projects: number
    folders: number
    files: number
    relationships: number
  }
  rows: AccessMapRow[]
}

export interface ProjectReport {
  filtros: { periodoDe?: string; periodoAte?: string; status?: ProjectStatus | "todos"; area?: string; projectId?: string; gestorId?: string }
  indicadores: {
    totalProjetos: number
    ativos: number
    suspensos: number
    concluidos: number
    armazenamentoUsadoMb: number
    totalMembros: number
    totalMapas: number
  }
  porArea: { area: string; total: number }[]
  porStatus: { status: ProjectStatus; total: number }[]
  projetos: (Project & { totalMapas: number; totalMembros: number })[]
}
