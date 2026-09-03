import type {
  ProjectReport,
  AccessRequest,
  AccessMapResponse,
  ActivityLog,
  DashboardSummary,
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
  PlatformCatalogs,
} from "@/lib/types"

/**
 * Client HTTP único da aplicação.
 *
 * Nenhum componente deve chamar `fetch` diretamente — toda comunicação com o
 * backend FastAPI passa por aqui. Configure `NEXT_PUBLIC_API_BASE_URL` para a
 * URL do serviço Python em desenvolvimento e produção. O cliente nunca usa
 * dados mockados, estado em memória ou API Routes locais.
 */
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
const isProduction = process.env.NODE_ENV === "production"
const API_BASE_URL = (configuredApiBaseUrl || "http://localhost:8080").replace(/\/$/, "")

/**
 * Todas as chamadas são direcionadas ao FastAPI configurado; o valor padrão de
 * desenvolvimento é `http://localhost:8080` para manter SQLite e PostgreSQL
 * compatíveis sem alterar o código do frontend.
 */
export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  usingExternalBackend: true,
  mode: "fastapi",
} as const

export type ObservabilityEvent = { timestamp: string; source: "frontend" | "backend"; level: string; message: string; endpoint?: string; status?: number; duration_ms?: number; correlation_id?: string; metadata?: Record<string, unknown> }
export type ObservabilityResponse = { events: ObservabilityEvent[]; stats: { total: number; errors: number; frontend: number; backend: number } }

export function getObservabilityEvents(params: { source?: string; status?: string; limit?: number } = {}) {
  const query = new URLSearchParams({ limit: String(params.limit ?? 250) })
  if (params.source) query.set("source", params.source)
  if (params.status) query.set("status", params.status)
  return request<ObservabilityResponse>(`/api/observabilidade/events?${query}`)
}

export function reportFrontendEvent(event: Omit<ObservabilityEvent, "timestamp" | "source">) {
  return fetchRequest(`${API_BASE_URL}/api/observabilidade/events`, { method: "POST", body: JSON.stringify(event), keepalive: true }).then(() => undefined)
}

export type SqlTable = { name: string; columns: Array<{ name: string; type: string }> }
export type SqlResult = { kind: string; columns: string[]; rows: Array<Record<string, unknown>>; rowCount: number; truncated: boolean; durationMs: number }

export function getSqlTables() {
  return request<{ tables: SqlTable[] }>("/api/sql-manager/tables")
}

export function previewSqlTable(name: string, page = 1) {
  return request<{ table: string; columns: Array<{ name: string; type: string }>; rows: Array<Record<string, unknown>>; page: number; pageSize: number; hasMore: boolean }>(`/api/sql-manager/tables/${encodeURIComponent(name)}/preview?page=${page}`)
}

export function executeSql(sql: string) {
  return request<SqlResult>("/api/sql-manager/execute", { method: "POST", body: JSON.stringify({ sql }) })
}

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

async function fetchRequest(url: string, init?: RequestInit): Promise<Response> {
  if (isProduction && !configuredApiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL precisa estar configurada em produção.")
  }

  return fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })
}

type ApiErrorBody = { message?: string; detail?: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const started = performance.now()
  const res = await fetchRequest(`${API_BASE_URL}${path}`, init)
  if (typeof window !== "undefined" && !path.startsWith("/api/observabilidade")) {
    void fetch(`${API_BASE_URL}/api/observabilidade/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level: res.ok ? "info" : "error", message: `${init?.method ?? "GET"} ${path}`, endpoint: path, status: res.status, metadata: { duration_ms: Math.round(performance.now() - started) } }) }).catch(() => undefined)
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ message: res.statusText }))) as ApiErrorBody
    throw new ApiError(res.status, body.message ?? body.detail ?? "Erro inesperado na requisição")
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Faz download binário usando exatamente a mesma base, cookies e tratamento de erro da API. */
export async function downloadFile(path: string): Promise<Blob> {
  const res = await fetchRequest(`${API_BASE_URL}${path}`, { headers: { Accept: "application/octet-stream" } })
  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? ""
    let message = res.statusText || "Não foi possível gerar o arquivo"
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => null)
      if (typeof body === "string") message = body
      else if (body && typeof body === "object") message = body.message ?? body.detail ?? message
    } else {
      const text = await res.text().catch(() => "")
      if (text.trim()) message = text.trim()
    }
    throw new ApiError(res.status, `${message} (HTTP ${res.status})`)
  }
  return res.blob()
}

/* ---------------------------------- Auth --------------------------------- */

export function login(email: string) {
  return request<{ user: SessionUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export function logout() {
  return request<void>("/api/auth/logout", { method: "POST" })
}

export function getSession() {
  return request<{ user: SessionUser | null }>("/api/auth/session")
}

/* ------------------------------- Catálogos -------------------------------- */

export function getCatalogs() {
  return request<PlatformCatalogs>("/api/catalogos")
}

/* -------------------------------- Projects -------------------------------- */

export function getProjects(params: { nome?: string; status?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)))
  return request<{ projects: Project[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>(`/api/projects${query.size ? `?${query}` : ""}`)
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

export function getProjectAccessMap(projectId: string) {
  return request<{ projectId: string; groups: Array<{ nome: string; fonte: string; identificadores: string[]; nivel: string }>; members: Array<ProjectMember & { user: User }>; source: string; consultedAt: string }>(`/api/projects/${projectId}/access-map`)
}

export async function getProjectMembers(projectId: string) {
  const response = await request<{ members?: Array<ProjectMember & { user: User }> } | Array<ProjectMember & { user: User }>>(`/api/projects/${projectId}/members`)
  return { members: Array.isArray(response) ? response : (response.members ?? []) }
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
  return request<void>(`/api/projects/${projectId}/members?user_id=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  })
}

/* ---------------------------------- Files --------------------------------- */

export async function getFiles(projectId: string, parentId: string | null) {
  const params = new URLSearchParams({ projectId })
  if (parentId) params.set("parentId", parentId)
  const response = await request<{ files: Array<FileNode & Record<string, unknown>>; breadcrumb?: FileNode[] }>(`/api/files?${params.toString()}`)
  const normalize = (file: FileNode & Record<string, unknown>): FileNode => ({
    id: String(file.id ?? ""),
    projectId: String(file.projectId ?? file.project_id ?? ""),
    parentId: (file.parentId ?? file.parent_id ?? null) as string | null,
    tipo: (file.tipo ?? file.kind ?? "arquivo") as FileNode["tipo"],
    nome: String(file.nome ?? file.name ?? ""),
    tamanho: Number(file.tamanho ?? file.size_bytes ?? 0),
    mimeType: (file.mimeType ?? file.mime_type ?? undefined) as string | undefined,
    criadoPor: String(file.criadoPor ?? file.created_by ?? ""),
    criadoEm: String(file.criadoEm ?? file.created_at ?? ""),
    atualizadoEm: String(file.atualizadoEm ?? file.updated_at ?? file.criadoEm ?? file.created_at ?? ""),
    compartilhamentos: (file.compartilhamentos ?? []) as FileNode["compartilhamentos"],
  })
  return { files: (response.files ?? []).map((file) => normalize(file as FileNode & Record<string, unknown>)), breadcrumb: (response.breadcrumb ?? []).map((file) => normalize(file as FileNode & Record<string, unknown>)) }
}

/** Lista todas as pastas do projeto (sem filtrar por parentId), usada no diálogo de mover item. */
export function getAllFolders(projectId: string) {
  return request<{ files: FileNode[] }>(`/api/files?projectId=${encodeURIComponent(projectId)}&allFolders=true`)
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
    body: JSON.stringify({
      project_id: data.projectId,
      parent_id: data.parentId,
      kind: data.tipo,
      name: data.nome,
      size_bytes: data.tamanho ?? 0,
      mime_type: data.mimeType,
    }),
  })
}

export function updateFileNode(id: string, data: Partial<Pick<FileNode, "nome" | "parentId">>) {
  return request<{ file: FileNode }>(`/api/files/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(data.nome !== undefined ? { name: data.nome } : {}),
      ...(data.parentId !== undefined ? { parent_id: data.parentId } : {}),
    }),
  })
}

export function deleteFileNode(id: string) {
  return request<void>(`/api/files/${id}`, { method: "DELETE" })
}

export async function shareFileNode(id: string, userId: string, nivel: ShareLevel) {
  await request(`/api/files/${id}/permissions`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, level: nivel }),
  })
  return request<{ file: FileNode }>(`/api/files/${id}`)
}

export async function unshareFileNode(id: string, userId: string) {
  await request<void>(`/api/files/${id}/permissions?user_id=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  })
  return request<{ file: FileNode }>(`/api/files/${id}`)
}

/* -------------------------------- Dashboard -------------------------------- */

export function getDashboardSummary() {
  return request<DashboardSummary>("/api/dashboard/summary")
}

/* --------------------------------- Reports --------------------------------- */

export type ConfiguredReportField = { id: string; report_code: string; field_key: string; label: string; source_key: string; display_order: number; active: boolean }

export function getReportFields(reportCode: string) {
  return request<{ reportCode: string; fields: ConfiguredReportField[] }>(`/api/report-fields?report_code=${encodeURIComponent(reportCode)}`)
}

export function getAccessMap() {
  return request<AccessMapResponse>("/api/access-map")
}

export function getAccessMapExportUrl(params: { format: string; fields: string; q?: string; type?: string; level?: string; view?: string }) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => value && query.set(key, value))
  return `${API_BASE_URL}/api/access-map/export?${query.toString()}`
}

export function getProjectReport(params: { status?: string; area?: string; gestorId?: string } = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => value && query.set(key, value))
  return request<ProjectReport>(`/api/reports${query.size ? `?${query.toString()}` : ""}`)
}

export function getProjectReportExportPath(params: { format: "csv" | "txt" | "pdf"; fields: string[]; status?: string; area?: string; gestorId?: string }) {
  const query = new URLSearchParams({ format: params.format, fields: params.fields.join(",") })
  if (params.status) query.set("status", params.status)
  if (params.area) query.set("area", params.area)
  if (params.gestorId) query.set("gestorId", params.gestorId)
  return `/api/reports?${query.toString()}`
}

/* ---------------------------------- Users --------------------------------- */

export async function getUsers() {
  const response = await request<User[] | { users: User[] }>("/api/users")
  return { users: Array.isArray(response) ? response : (response.users ?? []) }
}

export function updateUserRole(id: string, role: Role, perfilId: string) {
return request<User>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ role, perfilId }),
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

export type ActivityLogQuery = Record<string, string | number | undefined>

export function getActivityLogs(params: ActivityLogQuery = {}) {
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") queryParams.set(key, String(value))
  })
  const query = queryParams.size ? `?${queryParams}` : ""
  return request<{
    logs: (ActivityLog & { user: User | null; projetoNome?: string | null })[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }>(`/api/activity-logs${query}`)
}

export { ApiError }
