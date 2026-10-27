"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
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

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.replace("/login")
    } else if (!sessionLoading && !isLoading && (error || !project)) {
      router.replace("/projetos")
    }
  }, [error, isLoading, project, router, sessionLoading, user])

  if (sessionLoading || isLoading || !user || error || !project) {
    return <PetrobrasLoading label="Carregando projeto..." />
  }

  return (
    <PageLayout>
      <Link
        href="/projetos"
        className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrobras-green/50"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar para Áreas de Rede
      </Link>
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
