import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore, logActivity } from "@/lib/store"

export async function GET() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  return NextResponse.json({ settings: store.settings })
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") {
    return NextResponse.json({ message: "Apenas administradores podem alterar parâmetros." }, { status: 403 })
  }

  const body = await request.json()
  const store = getStore()
  store.settings = { ...store.settings, ...body }

  logActivity(user.id, "atualizar-parametros", "parametros", "global", "Atualizou os parâmetros da plataforma.")

  return NextResponse.json({ settings: store.settings })
}
