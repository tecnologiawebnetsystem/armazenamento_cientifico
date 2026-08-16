import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"
import { PlatformSettingsForm } from "@/components/administracao/platform-settings-form"

export default async function AdministracaoParametrosPage() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) redirect("/login")
  if (user.role !== "admin") redirect("/dashboard")

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Parâmetros</h1>
        <p className="text-sm text-muted-foreground">
          Configure os parâmetros globais que afetam o comportamento da plataforma.
        </p>
      </div>

      <PlatformSettingsForm />
    </div>
  )
}
