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
import { Button } from "@/components/ui/button"

export default function ProjetoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isLoading: sessionLoading } = useSession()
  const { project, isLoading, error, refresh } = useProject(id)

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.replace("/login")
    }
  }, [router, sessionLoading, user])

  if (sessionLoading || isLoading || !user) {
    return <PetrobrasLoading label="Carregando projeto..." />
  }

  if (error || !project) {
    return (
      <PageLayout>
        <PageHeader eyebrow="Área de Rede" title="Não foi possível abrir esta área" />
        <div className="flex flex-col gap-4 rounded-xl border border-destructive/30 bg-card p-5">
          <p role="alert" className="text-sm leading-6 text-muted-foreground">
            Não foi possível carregar os dados da área de rede. Tente novamente; você permanecerá nesta página.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void refresh()}>Tentar novamente</Button>
            <Button variant="outline" render={<Link href="/projetos" />}>
              Voltar para Áreas de Rede
            </Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Link
        href="/projetos"
        className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-petrobras-green/50 focus-visible:outline-none"
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
      <ProjectDetailTabs
        projectId={id}
        initialProject={project}
        canManageMembers={user.role === "admin" || user.role === "gerente"}
      />
    </PageLayout>
  )
}
