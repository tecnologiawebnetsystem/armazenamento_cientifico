import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"
import { PermissionMatrixEditor } from "@/components/administracao/permission-matrix-editor"

export default async function AdministracaoPermissoesPage() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) redirect("/login")
  if (user.role !== "admin") redirect("/dashboard")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Matriz de permissões</h1>
        <p className="text-sm text-muted-foreground">
          Defina as alçadas padrão de cada papel na plataforma. Estas regras servem de base para o que cada usuário
          pode fazer em projetos e arquivos.
        </p>
      </div>

      <PermissionMatrixEditor />
    </div>
  )
}
