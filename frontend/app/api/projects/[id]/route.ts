import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { canAccessProject, findUserById, getStore, logActivity } from "@/lib/store"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const project = store.projects.find((p) => p.id === id)
  if (!project) return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 })

  // admin e patrocinador acessam qualquer projeto; demais precisam ser membros
  // ou gestores do projeto.
  const canSeeAll = user.role === "admin" || user.role === "patrocinador"
  const isMember =
    store.projectMembers.some((m) => m.projectId === id && m.userId === user.id) ||
    project.gestoresIds?.includes(user.id)
  if (!canSeeAll && !isMember) {
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

  if (!canAccessProject(user.id, id, "write")) {
    return NextResponse.json({ message: "Sem permissão para editar este projeto." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 })
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 })
  }

  const input = body as Record<string, unknown>
  const allowedFields = ["nome", "areaResponsavel", "descricao", "status"] as const
  for (const field of allowedFields) {
    if (field in input) {
      if (typeof input[field] !== "string" || !input[field].trim()) {
        return NextResponse.json({ message: `O campo ${field} é inválido.` }, { status: 400 })
      }
      if (field === "status" && !["ativo", "concluido", "suspenso"].includes(input[field] as string)) {
        return NextResponse.json({ message: "Status inválido." }, { status: 400 })
      }
    }
  }

  Object.assign(project, Object.fromEntries(allowedFields.filter((field) => field in input).map((field) => [field, input[field]])), {
    atualizadoEm: new Date().toISOString(),
  })

  logActivity(user.id, "editar-projeto", "projeto", id, `Atualizou o projeto "${project.nome}".`)

  return NextResponse.json({ project })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return PATCH(request, { params })
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
  if (!project) return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 })
  project.status = "suspenso"
  project.atualizadoEm = new Date().toISOString()
  logActivity(user.id, "excluir-projeto", "projeto", id, `Desativou o projeto "${project.nome}".`)
  return NextResponse.json({ project })
}
