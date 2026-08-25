import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore } from "@/lib/store"
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard"

export default async function DashboardPage() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)!
  const store = getStore()
  const hasGlobalVisibility = user.role === "admin" || user.role === "patrocinador" || user.role === "auditor"

  const visibleProjects = hasGlobalVisibility
    ? store.projects
    : store.projects.filter((project) =>
        project.gestoresIds.includes(user.id) ||
        store.projectMembers.some((member) => member.userId === user.id && member.projectId === project.id && member.papel === "gerente"),
      )

  const projectIds = new Set(visibleProjects.map((project) => project.id))
  const visibleFiles = store.files.filter((file) => projectIds.has(file.projectId))
  const memberIdsInScope = new Set(
    store.projectMembers.filter((member) => projectIds.has(member.projectId)).map((member) => member.userId),
  )

  return (
    <ExecutiveDashboard
      projects={visibleProjects}
      totalMembros={memberIdsInScope.size}
      totalMapas={visibleFiles.length}
      armazenamentoMb={visibleProjects.reduce((sum, project) => sum + (project.armazenamentoUsadoMb ?? 0), 0)}
      pendencias={hasGlobalVisibility ? store.accessRequests.filter((request) => request.status === "pendente").length : 0}
    />
  )
}
