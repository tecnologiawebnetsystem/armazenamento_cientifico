import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore } from "@/lib/store"

export async function GET() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") {
    return NextResponse.json({ message: "Apenas administradores podem ver a trilha de auditoria." }, { status: 403 })
  }

  const store = getStore()
  const logs = store.activityLogs.map((log) => ({
    ...log,
    user: store.users.find((u) => u.id === log.userId) ?? null,
  }))

  return NextResponse.json({ logs })
}
