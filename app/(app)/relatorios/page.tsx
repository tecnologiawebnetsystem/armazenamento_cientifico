"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getProjectReport } from "@/lib/api-client"
import type { ProjectReport } from "@/lib/types"

const fetcher = () => getProjectReport()

export default function ReportsPage() {
  const { data, error, isLoading } = useSWR<ProjectReport>("/api/reports", fetcher)
  if (isLoading) return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Consultas e relatórios</h1><p className="text-muted-foreground">Carregando dados...</p></main>
  if (error || !data) return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Consultas e relatórios</h1><p className="text-destructive">Não foi possível carregar o relatório.</p></main>
  return <main className="flex flex-col gap-6">
    <div><h1 className="text-2xl font-semibold tracking-tight">Consultas e relatórios</h1><p className="text-muted-foreground">Visão consolidada dos projetos disponíveis para o seu perfil.</p></div>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores">
      {[['Projetos', data.indicadores.totalProjetos], ['Ativos', data.indicadores.ativos], ['Mapas', data.indicadores.totalMapas], ['Membros', data.indicadores.totalMembros]].map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{value}</p></CardContent></Card>)}
    </section>
    <Card><CardHeader><CardTitle>Projetos no escopo</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-3">{data.projetos.map((project) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4" key={project.id}><div><p className="font-medium">{project.nome}</p><p className="text-sm text-muted-foreground">{project.areaResponsavel} · {project.totalMapas} mapas · {project.totalMembros} membros</p></div><Badge variant="secondary">{project.status}</Badge></div>)}</div></CardContent></Card>
  </main>
}
