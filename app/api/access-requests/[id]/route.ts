import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore, logActivity } from "@/lib/store"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") {
    // Simula a concessão de acesso pela solução Cav4, restrita ao administrador.
    return NextResponse.json({ message: "Apenas administradores podem conceder acessos (Cav4)." }, { status: 403 })
  }

  const store = getStore()
  const accessRequest = store.accessRequests.find((r) => r.id === id)
  if (!accessRequest) return NextResponse.json({ message: "Solicitação não encontrada." }, { status: 404 })

  const { status } = await request.json()
  accessRequest.status = status
  accessRequest.atualizadoEm = new Date().toISOString()
  accessRequest.analisadoPor = user.id

  if (status === "aprovado") {
    const existing = store.projectMembers.find(
      (m) => m.projectId === accessRequest.projetoId && m.userId === accessRequest.usuarioId,
    )
    if (existing) {
      existing.papel = accessRequest.papelSolicitado
    } else {
      store.projectMembers.push({
        projectId: accessRequest.projetoId,
        userId: accessRequest.usuarioId,
        papel: accessRequest.papelSolicitado,
        adicionadoEm: new Date().toISOString(),
      })
    }
  }

  logActivity(
    user.id,
    status === "aprovado" ? "aprovar-solicitacao" : "negar-solicitacao",
    "solicitacao-acesso",
    accessRequest.id,
    `${status === "aprovado" ? "Aprovou" : "Negou"} a solicitação de acesso ao projeto ${accessRequest.projetoId}.`,
  )

  return NextResponse.json({ request: accessRequest })
}
