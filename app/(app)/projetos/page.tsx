import { getBackendSession } from "@/lib/session"
import { hasCapability } from "@/hooks/use-permissions"
import { ProjectsList } from "@/components/projects/projects-list"
import { BackButton } from "@/components/navigation/back-button"

export default async function ProjetosPage() {
  const user = await getBackendSession()
  const canCreate = Boolean(user && hasCapability(user.role, "create"))

  return (
    <div className="flex flex-col gap-6">
      <BackButton />
      <ProjectsList canCreate={canCreate} />
    </div>
  )
}
