import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore } from "@/lib/store"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") {
    return NextResponse.json({ message: "Apenas administradores podem alterar papéis." }, { status: 403 })
  }

  const store = getStore()
  const target = store.users.find((u) => u.id === id)
  if (!target) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 })

  const { role } = await request.json()
  target.role = role

  return NextResponse.json({ user: target })
}
