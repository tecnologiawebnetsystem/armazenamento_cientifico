import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore, logActivity } from "@/lib/store"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const project = store.projects.find((p) => p.id === id)
  if (!project) return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 })

  const isMember = store.projectMembers.some((m) => m.projectId === id && m.userId === user.id)
  if (user.role !== "admin" && !isMember) {
    return NextResponse.json({ message: "Sem acesso a este projeto." }, { status: 403 })
  }

  const participantesIds = store.projectMembers.filter((m) => m.projectId === id).map((m) => m.userId)

  return NextResponse.json({ project: { ...project, participantesIds } })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const project = store.projects.find((p) => p.id === id)
  if (!project) return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 })

  const role = store.projectMembers.find((m) => m.projectId === id && m.userId === user.id)?.papel
  if (user.role !== "admin" && role !== "gestor") {
    return NextResponse.json({ message: "Sem permissão para editar este projeto." }, { status: 403 })
  }

  const body = await request.json()
  Object.assign(project, body, { atualizadoEm: new Date().toISOString() })

  logActivity(user.id, "editar-projeto", "projeto", id, `Atualizou o projeto "${project.nome}".`)

  return NextResponse.json({ project })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") {
    return NextResponse.json({ message: "Apenas administradores podem excluir projetos." }, { status: 403 })
  }

  const store = getStore()
  const project = store.projects.find((p) => p.id === id)
  store.projects = store.projects.filter((p) => p.id !== id)
  store.projectMembers = store.projectMembers.filter((m) => m.projectId !== id)
  store.files = store.files.filter((f) => f.projectId !== id)

  logActivity(user.id, "excluir-projeto", "projeto", id, `Excluiu o projeto "${project?.nome ?? id}".`)

  return new NextResponse(null, { status: 204 })
}
