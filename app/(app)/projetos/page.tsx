import { getBackendSession } from "@/lib/session"
import { hasEffectiveCapability, normalizeRole } from "@/hooks/use-permissions"
import { ProjectsList } from "@/components/projects/projects-list"
import { BackButton } from "@/components/navigation/back-button"

export default async function ProjetosPage() {
  const user = await getBackendSession()
  const canCreate = Boolean(user && (hasEffectiveCapability(user.permissions, "create") || normalizeRole(user.role) === "admin"))

  return (
    <div className="flex flex-col gap-6">
      <BackButton />
      <ProjectsList canCreate={canCreate} />
    </div>
  )
}
