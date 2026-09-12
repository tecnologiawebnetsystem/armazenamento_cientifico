"use client"

import useSWR from "swr"
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard"
import { PageError, PageLoading } from "@/components/ui/page-state"
import { getDashboardSummary } from "@/lib/api-client"
import type { DashboardSummary } from "@/lib/types"

const fetcher = () => getDashboardSummary()

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<DashboardSummary>("dashboard-summary", fetcher, {
    revalidateOnFocus: false,
  })

  if (isLoading) {
    return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Dashboard</h1><PageLoading label="Consultando indicadores no banco de dados..." /></main>
  }

  if (error || !data) {
    return <main className="flex flex-col gap-4"><h1 className="text-2xl font-semibold">Dashboard</h1><PageError title="Não foi possível consultar o dashboard" message="Verifique a sessão e a disponibilidade da API." /></main>
  }

  return <ExecutiveDashboard projects={data.projects} totalMembros={data.totalMembros} totalMapas={data.totalMapas} armazenamentoMb={data.armazenamentoMb} pendencias={data.pendencias} />
}
