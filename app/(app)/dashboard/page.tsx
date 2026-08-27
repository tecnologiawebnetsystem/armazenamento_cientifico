"use client"

import useSWR from "swr"
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { getDashboardSummary } from "@/lib/api-client"
import type { DashboardSummary } from "@/lib/types"

const fetcher = () => getDashboardSummary()

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<DashboardSummary>("dashboard-summary", fetcher, {
    revalidateOnFocus: false,
  })

  if (isLoading) {
    return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Dashboard</h1><PetrobrasLoading label="Consultando indicadores no banco de dados..." /></main>
  }

  if (error || !data) {
    return <main className="flex flex-col gap-4"><h1 className="text-2xl font-semibold">Dashboard</h1><p className="text-destructive">Não foi possível consultar os dados reais do dashboard.</p><p className="text-sm text-muted-foreground">Verifique a sessão e a disponibilidade da API.</p></main>
  }

  return <ExecutiveDashboard projects={data.projects} totalMembros={data.totalMembros} totalMapas={data.totalMapas} armazenamentoMb={data.armazenamentoMb} pendencias={data.pendencias} activity={data.activity} source={data.source} consultedAt={data.consultedAt} />
}
