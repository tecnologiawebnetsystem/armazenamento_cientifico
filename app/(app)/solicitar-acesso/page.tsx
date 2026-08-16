import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"
import { AccessRequestForm } from "@/components/solicitar-acesso/access-request-form"
import { MyAccessRequestsList } from "@/components/solicitar-acesso/my-access-requests-list"

export default async function SolicitarAcessoPage() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) redirect("/login")

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Solicitar acesso</h1>
        <p className="text-sm text-muted-foreground">
          Peça acesso a um novo projeto ou solicite alteração de permissão em um projeto que você já participa. A
          solicitação é encaminhada para aprovação de um administrador (simulação da integração com Cav4/ServiceNow).
        </p>
      </div>

      <AccessRequestForm />
      <MyAccessRequestsList />
    </div>
  )
}
