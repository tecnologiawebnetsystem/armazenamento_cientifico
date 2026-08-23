import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, getStore } from "@/lib/store"

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
  const de = params.get("de")
  const ate = params.get("ate")
  const store = getStore()
  const logs = store.activityLogs
    .map((log) => ({ ...log, user: store.users.find((u) => u.id === log.userId) ?? null }))
    .filter((log) => {
      const text = `${log.detalhes} ${log.entidade} ${log.entidadeId} ${log.user?.nome ?? ""}`.toLowerCase()
      return (!query || text.includes(query)) && (!userFilter || log.userId === userFilter) &&
        (!acao || log.acao === acao) && (!entidade || log.entidade === entidade) &&
        (!de || log.criadoEm >= de) && (!ate || log.criadoEm <= `${ate}T23:59:59.999Z`)
    })
  return NextResponse.json({ logs })
}
