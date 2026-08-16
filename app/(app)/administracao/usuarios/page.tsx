import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"
import { UsersTable } from "@/components/administracao/users-table"

export default async function AdministracaoUsuariosPage() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) redirect("/login")
  if (user.role !== "admin") redirect("/dashboard")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie o papel global de cada usuário cadastrado na plataforma.
        </p>
      </div>

      <UsersTable currentUserId={user.id} />
    </div>
  )
}
