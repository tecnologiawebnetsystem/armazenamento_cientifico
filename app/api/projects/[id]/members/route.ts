import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore } from "@/lib/store"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const members = store.projectMembers
    .filter((m) => m.projectId === id)
    .map((m) => ({ ...m, user: store.users.find((u) => u.id === m.userId)! }))
    .filter((m) => m.user)

  return NextResponse.json({ members })
}

function canManageMembers(role: string, projectRole: string | undefined) {
  return role === "admin" || projectRole === "gestor"
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const projectRole = store.projectMembers.find((m) => m.projectId === id && m.userId === user.id)?.papel

  if (!canManageMembers(user.role, projectRole)) {
    return NextResponse.json({ message: "Sem permissão para gerenciar membros." }, { status: 403 })
  }

  const { userId: newUserId, papel } = await request.json()

  if (store.projectMembers.some((m) => m.projectId === id && m.userId === newUserId)) {
    return NextResponse.json({ message: "Usuário já é membro deste projeto." }, { status: 409 })
  }

  const member = { projectId: id, userId: newUserId, papel, adicionadoEm: new Date().toISOString() }
  store.projectMembers.push(member)

  return NextResponse.json({ member }, { status: 201 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const projectRole = store.projectMembers.find((m) => m.projectId === id && m.userId === user.id)?.papel

  if (!canManageMembers(user.role, projectRole)) {
    return NextResponse.json({ message: "Sem permissão para gerenciar membros." }, { status: 403 })
  }

  const { userId: targetUserId, papel } = await request.json()
  const member = store.projectMembers.find((m) => m.projectId === id && m.userId === targetUserId)
  if (!member) return NextResponse.json({ message: "Membro não encontrado." }, { status: 404 })

  member.papel = papel

  return NextResponse.json({ member })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const projectRole = store.projectMembers.find((m) => m.projectId === id && m.userId === user.id)?.papel

  if (!canManageMembers(user.role, projectRole)) {
    return NextResponse.json({ message: "Sem permissão para gerenciar membros." }, { status: 403 })
  }

  const targetUserId = new URL(request.url).searchParams.get("userId")
  store.projectMembers = store.projectMembers.filter((m) => !(m.projectId === id && m.userId === targetUserId))

  return new NextResponse(null, { status: 204 })
}
