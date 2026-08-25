import Link from "next/link"
import { FolderPlusIcon } from "lucide-react"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"
import { getRolePermissions } from "@/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import { ProjectsList } from "@/components/projects/projects-list"
import { BackButton } from "@/components/navigation/back-button"

export default async function ProjetosPage() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  const canCreate = user ? getRolePermissions(user.role).criarProjetos : false

  return (
    <div className="flex flex-col gap-6">
      <BackButton />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os projetos científicos e o acesso aos seus dados armazenados.
          </p>
        </div>
        {canCreate && (
          <Button render={<Link href="/projetos/novo" />} nativeButton={false}>
            <FolderPlusIcon data-icon="inline-start" />
            Novo projeto
          </Button>
        )}
      </div>

      <ProjectsList canCreate={canCreate} />
    </div>
  )
}
