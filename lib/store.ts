import {
  accessRequests as seedAccessRequests,
  activityLogs as seedActivityLogs,
  defaultPermissionMatrix,
  defaultPlatformSettings,
  files as seedFiles,
  projectMembers as seedProjectMembers,
  projects as seedProjects,
  testCredentials,
  users as seedUsers,
} from "@/lib/mock-data"
import type {
  AccessRequest,
  ActivityAction,
  ActivityLog,
  FileNode,
  PermissionMatrixEntry,
  PlatformSettings,
  Project,
  ProjectMember,
  User,
} from "@/lib/types"

/**
 * Store singleton em memória usado por todas as API Routes mock.
 *
 * Em `next dev`, o módulo é mantido vivo entre requisições (mesmo processo
 * Node), então o estado persiste durante a sessão de testes locais. Reiniciar
 * o servidor restaura os dados de exemplo. Ao trocar para o backend em
 * Python, cada função abaixo deve ser reescrita para consultar o banco real,
 * mantendo as mesmas assinaturas usadas pelas rotas.
 */
declare global {
  // eslint-disable-next-line no-var
  var __wayonStore:
    | {
        users: User[]
        projects: Project[]
        projectMembers: ProjectMember[]
        files: FileNode[]
        accessRequests: AccessRequest[]
        permissionMatrix: PermissionMatrixEntry[]
        settings: PlatformSettings
        activityLogs: ActivityLog[]
      }
    | undefined
}

function createStore() {
  return {
    users: structuredClone(seedUsers),
    projects: structuredClone(seedProjects),
    projectMembers: structuredClone(seedProjectMembers),
    files: structuredClone(seedFiles),
    accessRequests: structuredClone(seedAccessRequests),
    permissionMatrix: structuredClone(defaultPermissionMatrix),
    settings: structuredClone(defaultPlatformSettings),
    activityLogs: structuredClone(seedActivityLogs),
  }
}

export function getStore() {
  if (!globalThis.__wayonStore) {
    globalThis.__wayonStore = createStore()
  }
  return globalThis.__wayonStore
}

export function findUserByCredentials(email: string, senha: string): User | null {
  const cred = testCredentials[email.toLowerCase()]
  if (!cred || cred.senha !== senha) return null
  const store = getStore()
  return store.users.find((u) => u.id === cred.userId) ?? null
}

export function findUserById(id: string | null): User | null {
  if (!id) return null
  const store = getStore()
  return store.users.find((u) => u.id === id) ?? null
}

export function getProjectRole(userId: string, projectId: string): string | null {
  const store = getStore()
  const member = store.projectMembers.find((m) => m.userId === userId && m.projectId === projectId)
  return member?.papel ?? null
}

export function genId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

/** Permissões padrão do papel, conforme a matriz de alçadas administrável. */
export function getPermissionsForRole(papel: string) {
  const store = getStore()
  return store.permissionMatrix.find((p) => p.papel === papel) ?? null
}

/**
 * Papel efetivo do usuário dentro de um projeto: admin global sempre tem
 * acesso total; caso contrário usa o papel atribuído via ProjectMember.
 */
export function getEffectiveProjectRole(userId: string, projectId: string): string | null {
  const store = getStore()
  const user = store.users.find((u) => u.id === userId)
  if (user?.role === "admin") return "admin"
  return getProjectRole(userId, projectId)
}

export function isProjectMember(userId: string, projectId: string): boolean {
  return getEffectiveProjectRole(userId, projectId) !== null
}

/**
 * Define o escopo de leitura e escrita para projetos e seus mapas/arquivos.
 * Patrocinadores e administradores consultam todos; gerentes somente os seus.
 */
export function canAccessProject(userId: string, projectId: string, action: "read" | "write" | "delete" = "read"): boolean {
  const store = getStore()
  const user = findUserById(userId)
  const project = store.projects.find((item) => item.id === projectId)
  if (!user || !project) return false
  if (user.role === "admin") return true
  if (user.role === "patrocinador") return action === "read"

  // Gerentes só podem consultar e operar os mapas dos projetos que gerenciam.
  // Ser membro de outro projeto não amplia o escopo do gerente.
  if (user.role === "gerente") {
    return project.gestoresIds?.includes(user.id) === true
  }

  if (project.gestoresIds?.includes(user.id)) return action !== "delete"
  const member = store.projectMembers.find((item) => item.projectId === projectId && item.userId === userId)
  if (!member) return false
  if (action === "read") return true
  return member.papel !== "visualizador" && member.papel !== "auditor"
}

export function getVisibleProjects(userId: string): Project[] {
  const store = getStore()
  return store.projects.filter((project) => canAccessProject(userId, project.id, "read"))
}

/** Registra uma ação na trilha de auditoria da plataforma. */
export function logActivity(
  userId: string,
  acao: ActivityAction,
  entidade: string,
  entidadeId: string,
  detalhes: string,
) {
  const store = getStore()
  store.activityLogs.unshift({
    id: genId("log"),
    userId,
    acao,
    entidade,
    entidadeId,
    detalhes,
    criadoEm: new Date().toISOString(),
  })
}
