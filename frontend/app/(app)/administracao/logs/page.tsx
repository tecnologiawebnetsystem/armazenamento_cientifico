import { redirect } from "next/navigation"
import { getBackendSession } from "@/lib/session"
import { ActivityLogTable } from "@/components/administracao/activity-log-table"
import { BackButton } from "@/components/navigation/back-button"

export default async function AdministracaoLogsPage() {
  const user = await getBackendSession()
  if (!user) redirect("/login")
  if (user.role !== "admin" && user.role !== "auditor") redirect("/dashboard")

  return (
    <div className="flex flex-col gap-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trilha de auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Histórico de ações relevantes realizadas por usuários administradores e gestores na plataforma.
        </p>
      </div>

      <ActivityLogTable />
    </div>
  )
}
