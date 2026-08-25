import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore, getVisibleProjects, logActivity } from "@/lib/store"

export async function GET(request: Request) {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("nome")?.trim().toLowerCase() ?? ""
  const status = searchParams.get("status")
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50") || 50))

  // Diretório minimalista de todos os projetos, usado para o usuário
  // selecionar a que projeto deseja solicitar acesso (não expõe dados sensíveis).
  if (searchParams.get("all") === "true") {
    const projects = store.projects.map((p) => ({ id: p.id, nome: p.nome, areaResponsavel: p.areaResponsavel }))
    return NextResponse.json({ projects })
  }

  // Regras de visibilidade:
  // - admin e patrocinador enxergam TODOS os projetos (mapas) da plataforma.
  // - demais papéis (gerente, participante, etc.) enxergam apenas os projetos
  //   em que participam como membro OU dos quais são gestores.
  const visibleProjects = getVisibleProjects(user.id).filter((p) => {
    const matchesName = !search || p.nome.toLowerCase().includes(search) || p.codigo.toLowerCase().includes(search)
    return matchesName && (!status || status === "todos" || p.status === status)
  })
  const total = visibleProjects.length
  const pagedProjects = visibleProjects.slice((page - 1) * limit, page * limit)

  const projects = pagedProjects.map((p) => ({
    ...p,
    participantesIds: store.projectMembers.filter((m) => m.projectId === p.id).map((m) => m.userId),
  }))

  return NextResponse.json({ projects, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin" && user.role !== "gerente") {
    return NextResponse.json({ message: "Sem permissão para criar projetos." }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Payload inválido." }, { status: 400 })
  }
  const store = getStore()
  const asString = (value: unknown) => typeof value === "string" ? value : ""
  const asStringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
  const nome = asString(body.nome)
  const codigo = asString(body.codigo)
  const areaResponsavel = asString(body.areaResponsavel)
  if (nome.trim().length < 2 || !codigo.trim() || !areaResponsavel.trim()) {
    return NextResponse.json({ message: "Nome, código e área responsável são obrigatórios." }, { status: 400 })
  }
  if (store.projects.some((p) => p.codigo.toLowerCase() === codigo.trim().toLowerCase())) {
    return NextResponse.json({ message: "Código de projeto já existente." }, { status: 400 })
  }

  const now = new Date().toISOString()
  const id = `PRJ-${new Date().getFullYear()}-${String(store.projects.length + 1).padStart(3, "0")}`

  const gestoresIds: string[] = Array.from(new Set(asStringArray(body.gestoresIds).length ? asStringArray(body.gestoresIds) : [asString(body.gestorId) || user.id]))
  const project = {
    id,
    nome,
    codigo,
    areaResponsavel,
    gestoresIds: asStringArray(body.gestoresIds),
    grupoAdEscrita: asString(body.grupoAdEscrita),
    grupoAdLeitura: asString(body.grupoAdLeitura),
    roleIdentidadeEscrita: asString(body.roleIdentidadeEscrita),
    roleIdentidadeLeitura: asString(body.roleIdentidadeLeitura),
    numeroTarefaSnow: asString(body.numeroTarefaSnow),
    pastaMae: asString(body.pastaMae),
    descricao: asString(body.descricao),
    status: "ativo" as const,
    criadoEm: body.criadoEm ? new Date(`${body.criadoEm}T00:00:00.000Z`).toISOString() : now,
    atualizadoEm: now,
  }

  store.projects.push(project)

  const participantesIds: string[] = Array.from(new Set([...gestoresIds, user.id, ...asStringArray(body.participantesIds)]))
  for (const pid of participantesIds) {
    const papel = gestoresIds.includes(pid) ? "gerente" : "participante"
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
