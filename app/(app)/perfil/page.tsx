import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"
import { ProfileView } from "@/components/perfil/profile-view"

export default async function PerfilPage() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) redirect("/login")

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">
          Visualize seus dados cadastrais e os projetos em que você participa.
        </p>
      </div>

      <ProfileView user={user} />
    </div>
  )
}
