"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ProjectStatusBadge } from "@/components/projects/project-status-badge"
import { ProjectDetailTabs } from "@/components/projects/project-detail-tabs"
import { BackButton } from "@/components/navigation/back-button"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { useProject } from "@/hooks/use-project"
import { useSession } from "@/hooks/use-session"

export default function ProjetoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isLoading: sessionLoading } = useSession()
  const { project, isLoading, error } = useProject(id)

  if (sessionLoading || isLoading) return <PetrobrasLoading label="Carregando projeto..." />
  if (!user) {
    router.replace("/login")
    return null
  }
  if (error || !project) {
    router.replace("/projetos")
    return null
  }

  const canEdit = user.role === "admin" || user.role === "gerente"
  const canDelete = user.role === "admin"
  return (
    <div className="flex flex-col gap-6">
      <BackButton />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{project.codigo ?? project.id}</span>
          <ProjectStatusBadge status={project.status} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{project.nome}</h1>
        <p className="text-sm text-muted-foreground">{project.areaResponsavel}</p>
      </div>
      <ProjectDetailTabs projectId={id} initialProject={project} canEdit={canEdit} canDelete={canDelete} canManageMembers={canEdit} canWriteFiles={canEdit} />
    </div>
  )
}
