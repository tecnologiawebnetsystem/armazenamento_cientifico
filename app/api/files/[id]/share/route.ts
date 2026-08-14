import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, genId, getStore } from "@/lib/store"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const file = store.files.find((f) => f.id === id)
  if (!file) return NextResponse.json({ message: "Arquivo não encontrado." }, { status: 404 })

  const projectRole = store.projectMembers.find((m) => m.projectId === file.projectId && m.userId === user.id)?.papel
  if (user.role !== "admin" && projectRole === "visualizador") {
    return NextResponse.json({ message: "Sem permissão para compartilhar este item." }, { status: 403 })
  }

  const { userId: targetUserId, nivel } = await request.json()

  file.compartilhamentos = file.compartilhamentos.filter((s) => s.userId !== targetUserId)
  file.compartilhamentos.push({
    id: genId("sh"),
    userId: targetUserId,
    nivel,
    compartilhadoEm: new Date().toISOString(),
  })

  return NextResponse.json({ file })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const file = store.files.find((f) => f.id === id)
  if (!file) return NextResponse.json({ message: "Arquivo não encontrado." }, { status: 404 })

  const projectRole = store.projectMembers.find((m) => m.projectId === file.projectId && m.userId === user.id)?.papel
  if (user.role !== "admin" && projectRole === "visualizador") {
    return NextResponse.json({ message: "Sem permissão para alterar compartilhamentos." }, { status: 403 })
  }

  const targetUserId = new URL(request.url).searchParams.get("userId")
  file.compartilhamentos = file.compartilhamentos.filter((s) => s.userId !== targetUserId)

  return NextResponse.json({ file })
}
