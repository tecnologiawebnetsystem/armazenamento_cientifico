import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"
import { AccessRequestsQueue } from "@/components/administracao/access-requests-queue"

export default async function AdministracaoSolicitacoesPage() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) redirect("/login")
  if (user.role !== "admin") redirect("/dashboard")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fila de solicitações</h1>
        <p className="text-sm text-muted-foreground">
          Analise e conceda ou negue as solicitações de acesso enviadas pelos usuários (simulação da integração
          Cav4/ServiceNow).
        </p>
      </div>

      <AccessRequestsQueue />
    </div>
  )
}
