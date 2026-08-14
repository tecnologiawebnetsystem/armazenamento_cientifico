import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore } from "@/lib/store"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const file = store.files.find((f) => f.id === id)
  if (!file) return NextResponse.json({ message: "Arquivo não encontrado." }, { status: 404 })

  const projectRole = store.projectMembers.find((m) => m.projectId === file.projectId && m.userId === user.id)?.papel
  if (user.role !== "admin" && projectRole === "visualizador") {
    return NextResponse.json({ message: "Sem permissão para editar este item." }, { status: 403 })
  }

  const body = await request.json()
  Object.assign(file, body, { atualizadoEm: new Date().toISOString() })

  return NextResponse.json({ file })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const file = store.files.find((f) => f.id === id)
  if (!file) return NextResponse.json({ message: "Arquivo não encontrado." }, { status: 404 })

  const projectRole = store.projectMembers.find((m) => m.projectId === file.projectId && m.userId === user.id)?.papel
  if (user.role !== "admin" && projectRole === "visualizador") {
    return NextResponse.json({ message: "Sem permissão para excluir este item." }, { status: 403 })
  }

  const idsToRemove = new Set([id])
  let added = true
  while (added) {
    added = false
    for (const f of store.files) {
      if (f.parentId && idsToRemove.has(f.parentId) && !idsToRemove.has(f.id)) {
        idsToRemove.add(f.id)
        added = true
      }
    }
  }

  store.files = store.files.filter((f) => !idsToRemove.has(f.id))

  return new NextResponse(null, { status: 204 })
}
