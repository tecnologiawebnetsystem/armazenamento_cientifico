/**
 * Tipos de domínio da Plataforma de Armazenamento Científico.
 *
 * Estes tipos espelham o contrato de dados que o futuro backend em Python
 * (FastAPI/Flask) deverá implementar. Hoje eles são servidos por API Routes
 * mock (`app/api/**`) com dados em memória; a troca para o backend real deve
 * preservar exatamente estes formatos de request/response.
 */

export type Role = "admin" | "gestor" | "participante" | "visualizador"

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
  papel: Role
  adicionadoEm: string
}

export interface Project {
  id: string
  nome: string
  areaResponsavel: string
  gestorId: string
  descricao: string
  status: ProjectStatus
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
