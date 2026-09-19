"use client"

import useSWR from "swr"
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard"
import { PageError, PageLoading } from "@/components/ui/page-state"
import { useSession } from "@/hooks/use-session"
import { PageHeader, PageLayout } from "@/components/shared/page-layout"
import { getDashboardSummary } from "@/lib/api-client"
import type { DashboardSummary } from "@/lib/types"

const fetcher = () => getDashboardSummary()

export default function DashboardPage() {
  const { user } = useSession()
  const { data, error, isLoading } = useSWR<DashboardSummary>("dashboard-summary", fetcher, {
    revalidateOnFocus: false,
  })

  if (isLoading) {
    return <PageLayout><PageHeader title="Dashboard" description="Visão executiva dos projetos e acessos autorizados." /><PageLoading label="Consultando indicadores no banco de dados..." /></PageLayout>
  }

  if (error || !data) {
    return <PageLayout><PageHeader title="Dashboard" description="Visão executiva dos projetos e acessos autorizados." /><PageError title="Não foi possível consultar o dashboard" message="Verifique a sessão e a disponibilidade da API." /></PageLayout>
  }

  return <ExecutiveDashboard role={user?.role ?? "auditor"} projects={data.projects} totalMembros={data.totalMembros} totalMapas={data.totalMapas} armazenamentoMb={data.armazenamentoMb} pendencias={data.pendencias} />
}
