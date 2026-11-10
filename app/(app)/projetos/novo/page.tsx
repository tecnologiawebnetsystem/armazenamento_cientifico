import { redirect } from "next/navigation"
import { getBackendSession } from "@/lib/session"
import { normalizeRole } from "@/hooks/use-permissions"
import { NewProjectForm } from "@/components/projects/new-project-form"
import { PageLayout } from "@/components/shared/page-layout"

export default async function NovoProjetoPage() {
  const user = await getBackendSession()
  if (!user) redirect("/login")

  const canCreate = normalizeRole(user.role) === "admin"
  if (!canCreate) redirect("/projetos")

  return (
    <PageLayout className="mx-auto w-full max-w-4xl">
      <NewProjectForm currentUser={user} />
    </PageLayout>
  )
}
