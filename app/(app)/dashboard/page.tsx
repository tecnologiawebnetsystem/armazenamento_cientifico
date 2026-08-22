import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore } from "@/lib/store"
import { KpiCards, buildKpis } from "@/components/dashboard/kpi-cards"
import { RecentProjects } from "@/components/dashboard/recent-projects"
import { PendingRequestsPanel } from "@/components/dashboard/pending-requests-panel"
import { WelcomeBanner } from "@/components/dashboard/welcome-banner"

export default async function DashboardPage() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)!
  const store = getStore()

  const visibleProjects =
    user.role === "admin"
      ? store.projects
      : store.projects.filter((p) => store.projectMembers.some((m) => m.userId === user.id && m.projectId === p.id))

  const memberIdsInScope = new Set(
    store.projectMembers.filter((m) => visibleProjects.some((p) => p.id === m.projectId)).map((m) => m.userId),
  )

  const kpis = buildKpis({
    totalProjetos: visibleProjects.length,
    projetosAtivos: visibleProjects.filter((p) => p.status === "ativo").length,
    armazenamentoTotalMb: visibleProjects.reduce((sum, p) => sum + (p.armazenamentoUsadoMb ?? 0), 0),
    totalMembros: memberIdsInScope.size,
    solicitacoesPendentes:
      user.role === "admin" ? store.accessRequests.filter((r) => r.status === "pendente").length : 0,
  })

  const recentProjects = [...visibleProjects]
    .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime())
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner nome={user.nome} />
      <KpiCards items={kpis} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentProjects projects={recentProjects} />
        </div>
        {user.role === "admin" ? (
          <PendingRequestsPanel requests={store.accessRequests} users={store.users} projects={store.projects} />
        ) : null}
      </div>
    </div>
  )
}
