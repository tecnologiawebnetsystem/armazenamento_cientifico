import { notFound, redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { canAccessProject, findUserById, getStore, getEffectiveProjectRole, getPermissionsForRole } from "@/lib/store"
import { ProjectStatusBadge } from "@/components/projects/project-status-badge"
import { ProjectDetailTabs } from "@/components/projects/project-detail-tabs"
import { BackButton } from "@/components/navigation/back-button"

export default async function ProjetoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) redirect("/login")

  const store = getStore()
  const project = store.projects.find((p) => p.id === id)
  if (!project) notFound()

  if (!canAccessProject(user.id, id, "read")) redirect("/projetos")

  const effectiveRole = getEffectiveProjectRole(user.id, id)
  const participantesIds = store.projectMembers.filter((m) => m.projectId === id).map((m) => m.userId)

  // O papel armazenado para gestores é "gerente"; "admin" é global.
  // Patrocinadores têm acesso de leitura, mas não podem alterar projetos.
  const canEdit = user.role === "admin" || effectiveRole === "gerente" || effectiveRole === "gestor"
  const canDelete = user.role === "admin"
  const canManageMembers = canEdit

  const rolePerms = effectiveRole ? getPermissionsForRole(effectiveRole) : null
  const canWriteFiles = user.role === "admin" || !!rolePerms?.uploadArquivos

  return (
    <div className="flex flex-col gap-6">
      <BackButton />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{project.id}</span>
          <ProjectStatusBadge status={project.status} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{project.nome}</h1>
        <p className="text-sm text-muted-foreground">{project.areaResponsavel}</p>
      </div>

      <ProjectDetailTabs
        projectId={id}
        initialProject={{ ...project, participantesIds }}
        canEdit={canEdit}
        canDelete={canDelete}
        canManageMembers={canManageMembers}
        canWriteFiles={canWriteFiles}
      />
    </div>
  )
}
