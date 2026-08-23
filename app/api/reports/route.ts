import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore, getVisibleProjects } from "@/lib/store"
import type { ProjectReport, ProjectStatus } from "@/lib/types"

const statuses: ProjectStatus[] = ["ativo", "suspenso", "concluido"]

export async function GET(request: Request) {
  const user = findUserById(await getSessionUserId())
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  const params = new URL(request.url).searchParams
  const status = params.get("status") ?? "todos"
  const area = params.get("area") ?? ""
  const projectId = params.get("projectId") ?? ""
  if (status !== "todos" && !statuses.includes(status as ProjectStatus)) return NextResponse.json({ message: "Status inválido." }, { status: 400 })
  const store = getStore()
  const projetos = getVisibleProjects(user.id).filter((p) => (!projectId || p.id === projectId) && (!area || p.areaResponsavel === area) && (status === "todos" || p.status === status))
  const enriched = projetos.map((p) => ({ ...p, totalMapas: store.files.filter((f) => f.projectId === p.id).length, totalMembros: store.projectMembers.filter((m) => m.projectId === p.id).length }))
  const report: ProjectReport = { filtros: { status: status as ProjectReport["filtros"]["status"], area: area || undefined, projectId: projectId || undefined }, indicadores: { totalProjetos: enriched.length, ativos: enriched.filter((p) => p.status === "ativo").length, suspensos: enriched.filter((p) => p.status === "suspenso").length, concluidos: enriched.filter((p) => p.status === "concluido").length, armazenamentoUsadoMb: enriched.reduce((sum, p) => sum + (p.armazenamentoUsadoMb ?? 0), 0), totalMembros: enriched.reduce((sum, p) => sum + p.totalMembros, 0), totalMapas: enriched.reduce((sum, p) => sum + p.totalMapas, 0) }, porArea: Array.from(new Set(enriched.map((p) => p.areaResponsavel))).map((item) => ({ area: item, total: enriched.filter((p) => p.areaResponsavel === item).length })), porStatus: statuses.map((item) => ({ status: item, total: enriched.filter((p) => p.status === item).length })), projetos: enriched }
  return NextResponse.json(report)
}
