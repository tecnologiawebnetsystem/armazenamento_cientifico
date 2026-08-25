import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { canAccessProject, findUserById, getStore } from "@/lib/store"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Sessão expirada." }, { status: 401 })
  if (!canAccessProject(user.id, id, "read")) return NextResponse.json({ message: "Sem acesso a este projeto." }, { status: 403 })
  const store = getStore()
  const project = store.projects.find((item) => item.id === id)
  if (!project) return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 })
  const groups = [
    { nome: "Grupo de escrita", fonte: "Azure AD", identificadores: project.grupoAdEscrita ? [project.grupoAdEscrita] : [], nivel: "edicao" },
    { nome: "Grupo de leitura", fonte: "Azure AD", identificadores: project.grupoAdLeitura ? [project.grupoAdLeitura] : [], nivel: "leitura" },
    { nome: "Role de escrita", fonte: "Identidade", identificadores: project.roleIdentidadeEscrita ? [project.roleIdentidadeEscrita] : [], nivel: "edicao" },
    { nome: "Role de leitura", fonte: "Identidade", identificadores: project.roleIdentidadeLeitura ? [project.roleIdentidadeLeitura] : [], nivel: "leitura" },
  ]
  const members = store.projectMembers.filter((member) => member.projectId === id).map((member) => ({ ...member, user: store.users.find((item) => item.id === member.userId) })).filter((member) => member.user)
  return NextResponse.json({ projectId: id, groups, members, source: "SIGAC local directory", consultedAt: new Date().toISOString() })
}
