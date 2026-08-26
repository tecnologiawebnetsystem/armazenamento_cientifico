import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore, logActivity } from "@/lib/store"

export async function GET(request: Request) {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin" && user.role !== "auditor") {
    return NextResponse.json({ message: "Você não tem permissão para consultar os logs." }, { status: 403 })
  }

  const params = new URL(request.url).searchParams
  const query = params.get("q")?.trim().toLowerCase()
  const userFilter = params.get("usuario")
  const acao = params.get("acao")
  const entidade = params.get("entidade")
  const projeto = params.get("projeto")
  const resultado = params.get("resultado")
  const de = params.get("de")
  const ate = params.get("ate")
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1)
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? "50") || 50))
  const store = getStore()
  const logs = store.activityLogs
    .map((log) => ({ ...log, user: store.users.find((u) => u.id === log.userId) ?? null }))
    .filter((log) => {
      const text = `${log.detalhes} ${log.entidade} ${log.entidadeId} ${log.projetoId ?? ""} ${log.correlationId ?? ""} ${log.user?.nome ?? ""}`.toLowerCase()
      return (!query || text.includes(query)) && (!userFilter || log.userId === userFilter) &&
        (!projeto || log.projetoId === projeto) && (!resultado || log.resultado === resultado) &&
        (!acao || log.acao === acao) && (!entidade || log.entidade === entidade) &&
        (!de || log.criadoEm >= de) && (!ate || log.criadoEm <= `${ate}T23:59:59.999Z`)
    })
  const total = logs.length
  const format = params.get("format")
  const paged = logs.slice((page - 1) * limit, page * limit)
  if (format === "csv" || format === "txt") {
    logActivity(user.id, "exportar-logs", "auditoria", "activity-logs", `Exportou ${total} registros no formato ${format}.`)
    const header = format === "csv" ? "id;usuario;ação;entidade;entidadeId;detalhes;criadoEm" : "SIGAC - Exportação de logs\n"
    const body = logs.map((log) => format === "csv" ? [log.id, log.user?.nome ?? "", log.acao, log.entidade, log.entidadeId, log.detalhes, log.criadoEm].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";") : `${log.criadoEm} | ${log.user?.nome ?? "-"} | ${log.acao} | ${log.entidade}/${log.entidadeId} | ${log.detalhes}`).join("\n")
    return new Response(`${header}${body}\n`, { headers: { "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename=sigac-logs.${format}` } })
  }
  return NextResponse.json({ logs: paged, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
}
