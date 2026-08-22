import { NextResponse } from "next/server"
import { findUserByCredentials, logActivity } from "@/lib/store"
import { setSessionUserId } from "@/lib/session"

export async function POST(request: Request) {
  const { email, senha } = await request.json()

  if (!email || !senha) {
    return NextResponse.json({ message: "Informe e-mail e senha." }, { status: 400 })
  }

  const user = findUserByCredentials(email, senha)

  if (!user) {
    return NextResponse.json({ message: "E-mail ou senha inválidos." }, { status: 401 })
  }

  await setSessionUserId(user.id)

  logActivity(user.id, "login", "sessao", user.id, `${user.nome} entrou na plataforma.`)

  return NextResponse.json({ user })
}
