import { NextResponse } from "next/server"
import { clearSession, getSessionUserId, setSessionUserId } from "@/lib/session"
import { findUserById, upsertExternalUser } from "@/lib/store"

export async function GET() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  return NextResponse.json({ user })
}

/** Espelha no Next.js a sessão criada pelo backend FastAPI externo. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const backendUser = body?.user
  const userId = typeof backendUser?.id === "string" ? backendUser.id.trim() : ""

  if (!userId || typeof backendUser?.email !== "string") {
    return NextResponse.json({ message: "Sessão inválida." }, { status: 400 })
  }

  const user = upsertExternalUser(backendUser)
  await setSessionUserId(user.id)
  return NextResponse.json({ user })
}

export async function DELETE() {
  await clearSession()
  return new NextResponse(null, { status: 204 })
}
