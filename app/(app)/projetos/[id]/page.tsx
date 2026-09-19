"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ProjectStatusBadge } from "@/components/projects/project-status-badge"
import { ProjectDetailTabs } from "@/components/projects/project-detail-tabs"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { useProject } from "@/hooks/use-project"
import { useSession } from "@/hooks/use-session"
import { PageHeader, PageLayout } from "@/components/shared/page-layout"

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

  return (
    <PageLayout>
      <PageHeader
        eyebrow={project.codigo ?? project.id}
        title={project.nome}
        description={project.areaResponsavel}
        actions={<ProjectStatusBadge status={project.status} />}
      />
      <ProjectDetailTabs projectId={id} initialProject={project} canManageMembers={false} />
    </PageLayout>
  )
}
