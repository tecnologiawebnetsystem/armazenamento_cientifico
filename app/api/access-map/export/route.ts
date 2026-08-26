import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getAccessMap } from "@/lib/store"
import { renderPdf } from "@/lib/pdf"

const allowed = ["usuario", "email", "perfil", "area", "projeto", "recurso", "tipo", "acesso", "ultimaVisualizacao"] as const
const labels: Record<string, string> = {
  usuario: "Usuário", email: "E-mail", perfil: "Perfil", area: "Área", projeto: "Projeto",
  recurso: "Recurso", tipo: "Tipo de recurso", acesso: "Nível de acesso", ultimaVisualizacao: "Última visualização",
}

export async function GET(request: Request) {
  const user = findUserById(await getSessionUserId())
  if (!user) return NextResponse.json({ message: "Sessão expirada." }, { status: 401 })
  if (!["admin", "patrocinador", "gerente", "auditor"].includes(user.role)) return NextResponse.json({ message: "Sem permissão." }, { status: 403 })

  const params = new URL(request.url).searchParams
  const query = (params.get("q") ?? "").toLowerCase()
  const type = params.get("type") ?? "todos"
  const level = params.get("level") ?? "todos"
  const fields = (params.get("fields")?.split(",").filter((field) => allowed.includes(field as typeof allowed[number])) ?? [...allowed])
  const rows = getAccessMap(user.id).rows.filter((row) => {
    const text = `${row.userName} ${row.userEmail} ${row.projectName} ${row.resourceName}`.toLowerCase()
    return text.includes(query) && (type === "todos" || row.resourceType === type) && (level === "todos" || row.accessLevel === level)
  })
  const values = rows.map((row) => ({
    usuario: row.userName, email: row.userEmail, perfil: row.userRole, area: row.area, projeto: `${row.projectName} (${row.projectId})`,
    recurso: row.resourceName, tipo: row.resourceType, acesso: row.accessLevel, ultimaVisualizacao: new Date(row.lastViewedAt).toLocaleString("pt-BR"),
  }))
  const output = values.map((value) => fields.map((field) => String(value[field as keyof typeof value] ?? "")))
  const format = params.get("format")
  if (format === "pdf") {
    const pdf = await renderPdf("Relatório do mapa de acessos", fields, labels, output)
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=relatorio-acessos.pdf" } })
  }
  const content = format === "csv"
    ? [fields.map((field) => labels[field]).join(";"), ...output.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(";"))].join("\n")
    : `SIGAC - Relatório do mapa de acessos\n${output.map((row) => row.join(" | ")).join("\n")}`
  return new Response(`${content}\n`, { headers: { "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename=relatorio-acessos.${format === "txt" ? "txt" : "csv"}` } })
}
