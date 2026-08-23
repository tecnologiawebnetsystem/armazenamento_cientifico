import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getAccessMap } from "@/lib/store"

export async function GET() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Sessão expirada." }, { status: 401 })
  if (!["admin", "patrocinador", "gerente", "auditor"].includes(user.role)) {
    return NextResponse.json({ message: "Você não tem permissão para consultar o mapa de acessos." }, { status: 403 })
  }
  return NextResponse.json(getAccessMap(user.id))
}
