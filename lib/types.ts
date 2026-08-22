/**
 * Tipos de domínio da Plataforma de Armazenamento Científico.
 *
 * Estes tipos espelham o contrato de dados que o futuro backend em Python
 * (FastAPI/Flask) deverá implementar. Hoje eles são servidos por API Routes
 * mock (`app/api/**`) com dados em memória; a troca para o backend real deve
 * preservar exatamente estes formatos de request/response.
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

export type ProjectStatus = "ativo" | "concluido" | "suspenso"

export interface User {
  id: string
  nome: string
  email: string
  cargo: string
  area: string
  avatarUrl?: string
  /** Papel global do usuário na plataforma (independe do papel por projeto). */
  role: Role
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

export interface SessionUser extends User {}

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

export interface ActivityLog {
  id: string
  userId: string
  acao: ActivityAction
  entidade: string
  entidadeId: string
  detalhes: string
  criadoEm: string
}
