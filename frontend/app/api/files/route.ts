import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { canAccessProject, findUserById, genId, getStore, logActivity } from "@/lib/store"
import type { FileNode } from "@/lib/types"

function buildBreadcrumb(store: ReturnType<typeof getStore>, parentId: string | null): FileNode[] {
  const trail: FileNode[] = []
  let current = parentId
  while (current) {
    const node = store.files.find((f) => f.id === current)
    if (!node) break
    trail.unshift(node)
    current = node.parentId
  }
  return trail
}

export async function GET(request: Request) {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const parentId = searchParams.get("parentId")
  const allFolders = searchParams.get("allFolders") === "true"

  if (!projectId) return NextResponse.json({ message: "projectId é obrigatório." }, { status: 400 })

  const store = getStore()
  if (!canAccessProject(user.id, projectId, "read")) {
    return NextResponse.json({ message: "Sem acesso a este projeto." }, { status: 403 })
  }

  if (allFolders) {
    const files = store.files
      .filter((f) => f.projectId === projectId && f.tipo === "pasta")
      .sort((a, b) => a.nome.localeCompare(b.nome))
    return NextResponse.json({ files })
  }

  const files = store.files
    .filter((f) => f.projectId === projectId && f.parentId === parentId)
    .sort((a, b) => (a.tipo === b.tipo ? a.nome.localeCompare(b.nome) : a.tipo === "pasta" ? -1 : 1))

  const breadcrumb = buildBreadcrumb(store, parentId)

  return NextResponse.json({ files, breadcrumb })
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const body = await request.json()
  const store = getStore()

  if (!body.projectId || !canAccessProject(user.id, body.projectId, "write")) {
    return NextResponse.json({ message: "Sem permissão para criar conteúdo neste projeto." }, { status: 403 })
  }
  if (!['pasta', 'arquivo'].includes(body.tipo) || typeof body.nome !== 'string' || !body.nome.trim()) {
    return NextResponse.json({ message: "Dados inválidos para o mapa." }, { status: 400 })
  }

  const now = new Date().toISOString()
  const file: FileNode = {
    id: genId("f"),
    projectId: body.projectId,
    parentId: body.parentId ?? null,
    tipo: body.tipo,
    nome: body.nome,
    tamanho: body.tamanho,
    mimeType: body.mimeType,
    criadoPor: user.id,
    criadoEm: now,
    atualizadoEm: now,
    compartilhamentos: [],
  }

  store.files.push(file)

  logActivity(
    user.id,
    file.tipo === "pasta" ? "criar-pasta" : "enviar-arquivo",
    "arquivo",
    file.id,
    `${file.tipo === "pasta" ? "Criou a pasta" : "Enviou o arquivo"} "${file.nome}".`,
  )

  return NextResponse.json({ file }, { status: 201 })
}
