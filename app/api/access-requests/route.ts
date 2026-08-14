import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById, genId, getStore } from "@/lib/store"

export async function GET() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const store = getStore()
  const requests = user.role === "admin" ? store.accessRequests : store.accessRequests.filter((r) => r.usuarioId === user.id)

  return NextResponse.json({ requests })
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (!user) return NextResponse.json({ message: "Não autenticado." }, { status: 401 })

  const body = await request.json()
  const store = getStore()
  const now = new Date().toISOString()

  const accessRequest = {
    id: genId("ar"),
    usuarioId: user.id,
    projetoId: body.projetoId,
    tipo: body.tipo,
    papelSolicitado: body.papelSolicitado,
    justificativa: body.justificativa,
    // Simulação: número de chamado ServiceNow gerado localmente.
    numeroChamadoServiceNow: `SNOW-${Math.floor(400000 + Math.random() * 99999)}`,
    status: "pendente" as const,
    criadoEm: now,
    atualizadoEm: now,
  }

  store.accessRequests.unshift(accessRequest)

  return NextResponse.json({ request: accessRequest }, { status: 201 })
}
