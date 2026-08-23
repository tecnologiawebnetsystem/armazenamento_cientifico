import type {
  ProjectReport,
  AccessRequest,
  ActivityLog,
  FileNode,
  PermissionMatrixEntry,
  PlatformSettings,
  Project,
  ProjectMember,
  ProjectMemberRole,
  Role,
  SessionUser,
  ShareLevel,
  User,
} from "@/lib/types"

/**
 * Client HTTP único da aplicação.
 *
 * Nenhum componente deve chamar `fetch` diretamente — toda comunicação com o
 * backend passa por aqui. Hoje `API_BASE_URL` é relativo e aponta para as API
 * Routes mock deste projeto Next.js (`app/api/**`). Quando o backend em
 * Python (FastAPI/Flask) estiver disponível, basta apontar
 * `NEXT_PUBLIC_API_BASE_URL` para a URL real — os paths e os formatos de
 * request/response foram desenhados para serem replicados 1:1 pelo backend
 * definitivo.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, body.message ?? "Erro inesperado na requisição")
  }

  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

/* ---------------------------------- Auth --------------------------------- */

export function login(email: string, senha: string) {
  return request<{ user: SessionUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  })
}

export function logout() {
  return request<void>("/api/auth/logout", { method: "POST" })
}

export function getSession() {
  return request<{ user: SessionUser | null }>("/api/auth/session")
}

/* -------------------------------- Projects -------------------------------- */

export function getProjects() {
  return request<{ projects: Project[] }>("/api/projects")
}

/** Lista minimalista de todos os projetos da plataforma (para seleção em Solicitar Acesso). */
export function getAllProjectsDirectory() {
  return request<{ projects: Pick<Project, "id" | "nome" | "areaResponsavel">[] }>("/api/projects?all=true")
}

export function getProject(id: string) {
  return request<{ project: Project }>(`/api/projects/${id}`)
}

export function createProject(data: {
  nome: string
  codigo: string
  criadoEm: string
  areaResponsavel: string
  gestoresIds: string[]
  grupoAdEscrita: string
  grupoAdLeitura: string
  roleIdentidadeEscrita: string
  roleIdentidadeLeitura: string
  numeroTarefaSnow: string
  pastaMae: string
  descricao: string
  participantesIds: string[]
}) {
  return request<{ project: Project }>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateProject(id: string, data: Partial<Project>) {
  return request<{ project: Project }>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export function deleteProject(id: string) {
  return request<void>(`/api/projects/${id}`, { method: "DELETE" })
}

export function getProjectMembers(projectId: string) {
  return request<{ members: (ProjectMember & { user: User })[] }>(`/api/projects/${projectId}/members`)
}

export function addProjectMember(projectId: string, userId: string, papel: ProjectMemberRole) {
  return request<{ member: ProjectMember }>(`/api/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId, papel }),
  })
}

export function updateProjectMember(projectId: string, userId: string, papel: Role) {
  return request<{ member: ProjectMember }>(`/api/projects/${projectId}/members`, {
    method: "PATCH",
    body: JSON.stringify({ userId, papel }),
  })
}

export function removeProjectMember(projectId: string, userId: string) {
  return request<void>(`/api/projects/${projectId}/members?userId=${userId}`, {
    method: "DELETE",
  })
}

/* ---------------------------------- Files --------------------------------- */

export function getFiles(projectId: string, parentId: string | null) {
  const params = new URLSearchParams({ projectId })
  if (parentId) params.set("parentId", parentId)
  return request<{ files: FileNode[]; breadcrumb: FileNode[] }>(`/api/files?${params.toString()}`)
}

/** Lista todas as pastas do projeto (sem filtrar por parentId), usada no diálogo de mover item. */
export function getAllFolders(projectId: string) {
  return request<{ files: FileNode[] }>(`/api/files?projectId=${projectId}&allFolders=true`)
}


export function createFileNode(data: {
  projectId: string
  parentId: string | null
  tipo: "pasta" | "arquivo"
  nome: string
  tamanho?: number
  mimeType?: string
}) {
  return request<{ file: FileNode }>("/api/files", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateFileNode(id: string, data: Partial<Pick<FileNode, "nome" | "parentId">>) {
  return request<{ file: FileNode }>(`/api/files/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export function deleteFileNode(id: string) {
  return request<void>(`/api/files/${id}`, { method: "DELETE" })
}

export function shareFileNode(id: string, userId: string, nivel: ShareLevel) {
  return request<{ file: FileNode }>(`/api/files/${id}/share`, {
    method: "POST",
    body: JSON.stringify({ userId, nivel }),
  })
}

export function unshareFileNode(id: string, userId: string) {
  return request<{ file: FileNode }>(`/api/files/${id}/share?userId=${userId}`, {
    method: "DELETE",
  })
}

/* --------------------------------- Reports --------------------------------- */

export function getProjectReport(query = "") {
  return request<ProjectReport>(`/api/reports${query ? `?${query}` : ""}`)
}

/* ---------------------------------- Users --------------------------------- */

export function getUsers() {
  return request<{ users: User[] }>("/api/users")
}

export function updateUserRole(id: string, role: Role) {
  return request<{ user: User }>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  })
}

/* ----------------------------- Access requests ---------------------------- */

export function getAccessRequests() {
  return request<{ requests: AccessRequest[] }>("/api/access-requests")
}

export function createAccessRequest(data: {
  projetoId: string
  tipo: "novo-acesso" | "alteracao-permissao"
  papelSolicitado: Role
  justificativa: string
}) {
  return request<{ request: AccessRequest }>("/api/access-requests", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateAccessRequest(id: string, status: "aprovado" | "negado") {
  return request<{ request: AccessRequest }>(`/api/access-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

/* ------------------------------ Permissions ------------------------------- */

export function getPermissionMatrix() {
  return request<{ matrix: PermissionMatrixEntry[] }>("/api/permissions")
}

export function updatePermissionMatrix(matrix: PermissionMatrixEntry[]) {
  return request<{ matrix: PermissionMatrixEntry[] }>("/api/permissions", {
    method: "PUT",
    body: JSON.stringify({ matrix }),
  })
}

/* -------------------------------- Settings -------------------------------- */

export function getSettings() {
  return request<{ settings: PlatformSettings }>("/api/settings")
}

export function updateSettings(data: Partial<PlatformSettings>) {
  return request<{ settings: PlatformSettings }>("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

/* ------------------------------ Activity logs ------------------------------ */

export function getActivityLogs(params?: Record<string, string>) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : ""
  return request<{ logs: (ActivityLog & { user: User | null })[] }>(`/api/activity-logs${query}`)
}

export { ApiError }
