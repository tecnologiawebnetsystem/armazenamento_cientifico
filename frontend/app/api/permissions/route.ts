import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore, logActivity } from "@/lib/store"

export async function GET() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  return NextResponse.json({ matrix: store.permissionMatrix })
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") {
    return NextResponse.json({ message: "Apenas administradores podem alterar alçadas." }, { status: 403 })
  }

  const { matrix } = await request.json()
  const store = getStore()
  store.permissionMatrix = matrix

  logActivity(
    user.id,
    "atualizar-matriz-permissoes",
    "permissao",
    "matriz-global",
    "Atualizou a matriz de alçadas padrão da plataforma.",
  )

  return NextResponse.json({ matrix: store.permissionMatrix })
}
