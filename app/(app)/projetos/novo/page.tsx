import { redirect } from "next/navigation"
import { getBackendSession } from "@/lib/session"
import { normalizeRole } from "@/hooks/use-permissions"
import { NewProjectForm } from "@/components/projects/new-project-form"
import { PageHeader, PageLayout } from "@/components/shared/page-layout"

export default async function NovoProjetoPage() {
  const user = await getBackendSession()
  if (!user) redirect("/login")

  const canCreate = normalizeRole(user.role) === "admin"
  if (!canCreate) redirect("/projetos")

  return (
    <PageLayout className="mx-auto w-full max-w-2xl">
      <PageHeader
        eyebrow="Gestão de áreas de rede"
        title="Nova área de rede"
        description="Cadastre uma nova área de rede científica e defina seu gestor e participantes iniciais."
      />
      <NewProjectForm currentUser={user} />
    </PageLayout>
  )
}
