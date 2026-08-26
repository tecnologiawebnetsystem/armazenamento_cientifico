import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore, getVisibleProjects } from "@/lib/store"
import type { ProjectReport, ProjectStatus } from "@/lib/types"
import { renderPdf } from "@/lib/pdf"

const statuses: ProjectStatus[] = ["ativo", "suspenso", "concluido"]

export async function GET(request: Request) {
  const user = findUserById(await getSessionUserId())
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  const params = new URL(request.url).searchParams
  const status = params.get("status") ?? "todos"
  const area = params.get("area") ?? ""
  const projectId = params.get("projectId") ?? ""
  const gestorId = params.get("gestorId") ?? ""
  const gapsOnly = params.get("gaps") === "true"
  if (status !== "todos" && !statuses.includes(status as ProjectStatus)) return NextResponse.json({ message: "Status inválido." }, { status: 400 })
  const store = getStore()
  const projetos = getVisibleProjects(user.id).filter((p) => (!projectId || p.id === projectId) && (!area || p.areaResponsavel === area) && (!gestorId || p.gestoresIds?.includes(gestorId)) && (status === "todos" || p.status === status))
  const gaps = projetos.flatMap((p) => [
    !p.grupoAdLeitura && { projectId: p.id, projectName: p.nome, tipo: "grupo_leitura", mensagem: "Grupo de leitura não configurado." },
    !p.grupoAdEscrita && { projectId: p.id, projectName: p.nome, tipo: "grupo_escrita", mensagem: "Grupo de escrita não configurado." },
    !p.gestoresIds?.length && { projectId: p.id, projectName: p.nome, tipo: "gestor", mensagem: "Nenhum gestor associado." },
  ].filter(Boolean))
  if (gapsOnly) return NextResponse.json({ filtros: { status, area, projectId, gestorId }, total: gaps.length, gaps })
  const enriched = projetos.map((p) => ({ ...p, totalMapas: store.files.filter((f) => f.projectId === p.id).length, totalMembros: store.projectMembers.filter((m) => m.projectId === p.id).length }))
  const format = params.get("format")
  if (format === "csv" || format === "txt" || format === "pdf") {
    const allowed = ["nome", "codigo", "area", "status", "mapas", "membros"]
    const fields = (params.get("fields")?.split(",").filter((field) => allowed.includes(field)) ?? allowed)
    const labels: Record<string, string> = { nome: "Nome do projeto", codigo: "Código", area: "Área responsável", status: "Status", mapas: "Mapas", membros: "Membros" }
    const rows = enriched.map((project) => fields.map((field) => String(({ nome: project.nome, codigo: project.codigo, area: project.areaResponsavel, status: project.status, mapas: project.totalMapas, membros: project.totalMembros } as Record<string, unknown>)[field] ?? "")))
    if (format === "pdf") {
      const pdf = await renderPdf("Relatório de projetos", fields, labels, rows)
      return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=relatorio-projetos.pdf" } })
    }
    const content = format === "csv" ? [fields.map((field) => labels[field]).join(";"), ...rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(";"))].join("\n") : `SIGAC - Relatório de projetos\n${rows.map((row) => row.join(" | ")).join("\n")}`
    return new Response(`${content}\n`, { headers: { "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename=relatorio-projetos.${format}` } })
  }
  const report: ProjectReport = { filtros: { status: status as ProjectReport["filtros"]["status"], area: area || undefined, projectId: projectId || undefined, gestorId: gestorId || undefined }, indicadores: { totalProjetos: enriched.length, ativos: enriched.filter((p) => p.status === "ativo").length, suspensos: enriched.filter((p) => p.status === "suspenso").length, concluidos: enriched.filter((p) => p.status === "concluido").length, armazenamentoUsadoMb: enriched.reduce((sum, p) => sum + (p.armazenamentoUsadoMb ?? 0), 0), totalMembros: enriched.reduce((sum, p) => sum + p.totalMembros, 0), totalMapas: enriched.reduce((sum, p) => sum + p.totalMapas, 0) }, porArea: Array.from(new Set(enriched.map((p) => p.areaResponsavel))).map((item) => ({ area: item, total: enriched.filter((p) => p.areaResponsavel === item).length })), porStatus: statuses.map((item) => ({ status: item, total: enriched.filter((p) => p.status === item).length })), projetos: enriched }
  return NextResponse.json(report)
}
