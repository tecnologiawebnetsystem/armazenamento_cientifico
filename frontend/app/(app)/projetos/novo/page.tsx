import { redirect } from "next/navigation"
import { getBackendSession } from "@/lib/session"
import { hasCapability } from "@/hooks/use-permissions"
import { NewProjectForm } from "@/components/projects/new-project-form"

export default async function NovoProjetoPage() {
  const user = await getBackendSession()
  if (!user) redirect("/login")

  const canCreate = hasCapability(user.role, "create")
  if (!canCreate) redirect("/projetos")

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo projeto</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre um novo projeto científico e defina seu gestor e participantes iniciais.
        </p>
      </div>

      <NewProjectForm currentUser={user} />
    </div>
  )
}
