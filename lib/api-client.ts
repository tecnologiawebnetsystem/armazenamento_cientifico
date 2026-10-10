import type {
  ProjectReport,
  AccessMapResponse,
  DashboardSummary,
  FileNode,
  Project,
  ProjectMember,
  User,
  SessionUser,
  PlatformCatalogs,
  PlatformContext,
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
// No desenvolvimento, sempre use o proxy relativo `/api` para evitar CORS.
// A URL absoluta fica reservada para o bundle de produção.
const API_BASE_URL = (isProduction ? configuredApiBaseUrl || "" : "").replace(/\/$/, "")

/**
 * Todas as chamadas são direcionadas ao FastAPI configurado. Em desenvolvimento,
 * uma base vazia usa o proxy/rewrite do Next.js; em produção a variável precisa
 * apontar para o serviço FastAPI/Aurora correspondente.
 */
export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  usingExternalBackend: true,
  mode: "fastapi",
} as const

export class ApiError extends Error {
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

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 35_000)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

type ApiErrorBody = { message?: string; detail?: string }

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchRequest(`${API_BASE_URL}${path}`, init)
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

export async function login(email: string) {
  const response = await request<void>("/api/auth/login", { method: "POST", body: JSON.stringify({ email }) })
  await recordAuditEvent({ action: "login", entity: "sessao", details: { identificador: email } }).catch(() => undefined)
  return response
}

export async function logout() {
  await recordAuditEvent({ action: "logout", entity: "sessao" }).catch(() => undefined)
  return request<void>("/api/auth/logout", { method: "POST" })
}

export function recordAuditEvent(event: {
  action: string
  entity?: string
  entity_id?: string
  details?: Record<string, unknown>
  result?: string
}) {
  const details = {
    rota: window.location.pathname,
    url: window.location.href,
    origem: document.referrer || undefined,
    user_agent: navigator.userAgent,
    idioma: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    horario_cliente: new Date().toISOString(),
    ...event.details,
  }

  return request<void>("/api/audit/events", {
    method: "POST",
    body: JSON.stringify({
      entity: "interface",
      result: "sucesso",
      ...event,
      entity_id: event.entity_id?.slice(0, 36),
      details,
    }),
  })
}

export function getSession() {
  return request<{ user: SessionUser | null }>("/api/auth/session")
}

export function getPlatformContext() {
  return request<PlatformContext>("/api/platform/context")
}

/* ------------------------------- Catálogos -------------------------------- */

export function getCatalogs() {
  return request<PlatformCatalogs>("/api/catalogos")
}

export type ConfigurationResource = "menus" | "modules" | "permissions" | "menu_permissions" | "profiles" | "profile_permissions" | "profile_modules" | "project_statuses" | "responsible_areas" | "report_types" | "report_fields" | "dashboard_cards"
export type ConfigurationRow = Record<string, unknown> & { id?: string }
export function getConfigurations(resource: ConfigurationResource) { return request<ConfigurationRow[]>(`/api/configurations/${resource}`) }
export function createConfiguration(resource: ConfigurationResource, data: Record<string, unknown>) { return request<ConfigurationRow>(`/api/configurations/${resource}`, { method: "POST", body: JSON.stringify(data) }) }
export function updateConfiguration(resource: ConfigurationResource, id: string, data: Record<string, unknown>) { return request<ConfigurationRow>(`/api/configurations/${resource}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }) }
export function deleteConfiguration(resource: ConfigurationResource, id: string) { return request<void>(`/api/configurations/${resource}/${encodeURIComponent(id)}`, { method: "DELETE" }) }

export function getResponsibleAreas() {
  return request<{ areas: import("@/lib/types").ResponsibleArea[] }>("/api/projects/areas")
}

/* -------------------------------- Projects -------------------------------- */

export function getProjects(params: { nome?: string; status?: string; area?: string; page?: number; limit?: number } = {}) {
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
  codigo?: string
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
  return request<{ project: Project; projectId: string; groups: Array<{ nome: string; fonte: string; identificadores: string[]; nivel: string }>; members: Array<ProjectMember & { user: User }>; source: string; consultedAt: string; gaps?: string[] }>(`/api/projects/${projectId}/access-map`)
}

export async function getProjectMembers(projectId: string) {
  const response = await request<{ members?: Array<ProjectMember & { user: User }> } | Array<ProjectMember & { user: User }>>(`/api/projects/${projectId}/members`)
  return { members: Array.isArray(response) ? response : (response.members ?? []) }
}

/* --------------------------------- Folders -------------------------------- */

export function getFolders(projectId: string) {
  return request<{ folders: FileNode[] }>(`/api/folders?projectId=${encodeURIComponent(projectId)}`)
}

export function syncFolders(projectId: string) {
  return request<{ folders: FileNode[]; added: number; updated: number; removed: number; synchronized_at: string }>(`/api/folders/sync?projectId=${encodeURIComponent(projectId)}`, { method: "POST" })
}

export function getFolderPermissions(projectId: string, folderId: string) {
  return request<import("@/lib/types").FolderPermissions>(`/api/folders/${encodeURIComponent(folderId)}/permissions?projectId=${encodeURIComponent(projectId)}`)
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
  return `/api/reports/export?${query.toString()}`
}

/* --------------------------- Directory lookup ---------------------------- */

export async function getUsers() {
  const response = await request<User[] | { users: User[] }>("/api/users")
  return { users: Array.isArray(response) ? response : (response.users ?? []) }
}

/* ------------------------------ Activity logs ------------------------------ */

export type ActivityLogQuery = Record<string, string | number | undefined>

type ApiActivityLog = {
  id: string
  user_id?: string | null
  user_name?: string | null
  user_email?: string | null
  action?: string | null
  entity?: string | null
  entity_id?: string | null
  details?: unknown
  result?: string | null
  correlation_id?: string | null
  http_method?: string | null
  route?: string | null
  duration_ms?: number | null
  ip_address?: string | null
  project_id?: string | null
  project_name?: string | null
  created_at: string
}

export async function getActivityLogs(params: ActivityLogQuery = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)))
  if (!query.has("page")) query.set("page", "1")
  if (!query.has("limit")) query.set("limit", "25")
  const response = await request<{ items: ApiActivityLog[]; page: number; limit: number; total: number; total_pages: number }>(`/api/audit/logs?${query}`)
  return {
    logs: response.items.map((log) => ({
      id: log.id,
      user: null,
      userId: log.user_id ?? "",
      userName: log.user_name ?? log.user_id ?? null,
      userEmail: log.user_email ?? null,
      acao: log.action ?? "evento",
      entidade: log.entity ?? "interface",
      entidadeId: log.entity_id ?? "",
      detalhes: typeof log.details === "string" ? log.details : JSON.stringify(log.details ?? {}, null, 2),
      resultado: log.result === "erro" ? "erro" as const : "sucesso" as const,
      correlacaoId: log.correlation_id,
      metodoHttp: log.http_method,
      rota: log.route,
      duracaoMs: log.duration_ms,
      ipAddress: log.ip_address,
  projetoId: log.project_id,
  projetoNome: log.project_name,
  criadoEm: log.created_at,
    })),
    pagination: { page: response.page, limit: response.limit, total: response.total, totalPages: response.total_pages },
  }
}

