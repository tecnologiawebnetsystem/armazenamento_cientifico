"use client"

import useSWR from "swr"
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard"
import { PageError, PageLoading } from "@/components/ui/page-state"
import { useSession } from "@/hooks/use-session"
import { PageHeader, PageLayout } from "@/components/shared/page-layout"
import { getDashboardSummary, getInconsistencyReport } from "@/lib/api-client"
import type { DashboardSummary } from "@/lib/types"

const fetcher = () => getDashboardSummary()

export function DashboardPageContent() {
  const { user } = useSession()
  const { data, error, isLoading } = useSWR<DashboardSummary>(user ? "dashboard-summary" : null, fetcher, { revalidateOnFocus: false })
  const { data: inconsistencyData } = useSWR(user ? "dashboard-inconsistencies" : null, () => getInconsistencyReport(), { revalidateOnFocus: false })

  if (!user) {
    return <PageLayout><PageHeader title="Dashboard" description="Visão executiva das áreas de rede e acessos autorizados." /><PageLoading label="Validando sessão..." /></PageLayout>
  }

  if (isLoading) {
    return <PageLayout><PageHeader title="Dashboard" description="Visão executiva das áreas de rede e acessos autorizados." /><PageLoading label="Consultando indicadores no banco de dados..." /></PageLayout>
  }

  if (error || !data) {
    return <PageLayout><PageHeader title="Dashboard" description="Visão executiva das áreas de rede e acessos autorizados." /><PageError title="Não foi possível consultar o dashboard" message="Verifique a sessão e a disponibilidade da API." /></PageLayout>
  }

  return <ExecutiveDashboard role={user?.role ?? "auditor"} projects={data.projects} totalMembros={data.totalMembros} totalMapas={data.totalMapas} armazenamentoMb={data.armazenamentoMb} inconsistencias={inconsistencyData?.total ?? 0} activity={data.activity} consultedAt={data.consultedAt} />
}
