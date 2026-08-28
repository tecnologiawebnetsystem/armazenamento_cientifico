import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getAccessMap } from "@/lib/store"

export async function GET() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Sessão expirada." }, { status: 401 })
  const canAccess = user.perfilId ? ["ADM", "PAT", "GER", "AUD"].includes(user.perfilId) : ["admin", "patrocinador", "gerente", "auditor"].includes(user.role)
  if (!canAccess) return NextResponse.json({ message: "Você não tem permissão para consultar o mapa de acessos." }, { status: 403 })
  try {
    return NextResponse.json(getAccessMap(user.id))
  } catch (error) {
    console.error("[v0] Falha ao carregar mapa de acessos", error)
    return NextResponse.json({ message: "Não foi possível carregar o mapa de acessos." }, { status: 500 })
  }
}
