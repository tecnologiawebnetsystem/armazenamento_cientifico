import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore, logActivity } from "@/lib/store"

export async function GET(request: Request) {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const { searchParams } = new URL(request.url)

  // Diretório minimalista de todos os projetos, usado para o usuário
  // selecionar a que projeto deseja solicitar acesso (não expõe dados sensíveis).
  if (searchParams.get("all") === "true") {
    const projects = store.projects.map((p) => ({ id: p.id, nome: p.nome, areaResponsavel: p.areaResponsavel }))
    return NextResponse.json({ projects })
  }

  const visibleProjects =
    user.role === "admin"
      ? store.projects
      : store.projects.filter((p) => store.projectMembers.some((m) => m.projectId === p.id && m.userId === user.id))

  const projects = visibleProjects.map((p) => ({
    ...p,
    participantesIds: store.projectMembers.filter((m) => m.projectId === p.id).map((m) => m.userId),
  }))

  return NextResponse.json({ projects })
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin" && user.role !== "gestor") {
    return NextResponse.json({ message: "Sem permissão para criar projetos." }, { status: 403 })
  }

  const body = await request.json()
  const store = getStore()

  const now = new Date().toISOString()
  const id = `PRJ-${new Date().getFullYear()}-${String(store.projects.length + 1).padStart(3, "0")}`

  const project = {
    id,
    nome: body.nome,
    areaResponsavel: body.areaResponsavel,
    gestorId: body.gestorId ?? user.id,
    descricao: body.descricao ?? "",
    status: "ativo" as const,
    criadoEm: now,
    atualizadoEm: now,
  }

  store.projects.push(project)

  const participantesIds: string[] = Array.from(new Set([body.gestorId ?? user.id, user.id, ...(body.participantesIds ?? [])]))
  for (const pid of participantesIds) {
    const papel = pid === (body.gestorId ?? user.id) ? "gestor" : "participante"
    store.projectMembers.push({
      projectId: id,
      userId: pid,
      papel,
      adicionadoEm: now,
    })
  }

  logActivity(user.id, "criar-projeto", "projeto", id, `Criou o projeto "${project.nome}".`)

  return NextResponse.json({ project: { ...project, participantesIds } }, { status: 201 })
}
