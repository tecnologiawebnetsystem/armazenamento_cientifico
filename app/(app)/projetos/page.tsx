import { getBackendSession } from "@/lib/session"
import { normalizeRole } from "@/hooks/use-permissions"
import { ProjectsList } from "@/components/projects/projects-list"
export default async function ProjetosPage() {
  const user = await getBackendSession()
  const canCreate = Boolean(user && normalizeRole(user.role) === "admin")

  return (
    <div className="flex flex-col gap-6">
      <ProjectsList canCreate={canCreate} />
    </div>
  )
}
