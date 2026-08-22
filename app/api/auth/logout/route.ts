import { NextResponse } from "next/server"
import { clearSession, getSessionUserId } from "@/lib/session"
import { findUserById, logActivity } from "@/lib/store"

export async function POST() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (user) {
    logActivity(user.id, "logout", "sessao", user.id, `${user.nome} saiu da plataforma.`)
  }

  await clearSession()
  return new NextResponse(null, { status: 204 })
}
