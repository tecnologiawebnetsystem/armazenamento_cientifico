import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getVisibleProjects } from "@/lib/store"

export async function GET() {
  const user = findUserById(await getSessionUserId())
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  const gaps = getVisibleProjects(user.id).flatMap((project) => [
    !project.grupoAdLeitura && { projectId: project.id, projectName: project.nome, tipo: "grupo_leitura", mensagem: "Grupo de leitura não configurado." },
    !project.grupoAdEscrita && { projectId: project.id, projectName: project.nome, tipo: "grupo_escrita", mensagem: "Grupo de escrita não configurado." },
    !project.gestoresIds?.length && { projectId: project.id, projectName: project.nome, tipo: "gestor", mensagem: "Nenhum gestor associado." },
  ].filter(Boolean))
  return NextResponse.json({ total: gaps.length, gaps, consultedAt: new Date().toISOString() })
}
