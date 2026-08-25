"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { BarChart3, Download, Filter, FolderKanban, Map, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getProjectReport } from "@/lib/api-client"
import type { ProjectReport } from "@/lib/types"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { BackButton } from "@/components/navigation/back-button"

const fetcher = () => getProjectReport()

export default function ReportsPage() {
  const { data, error, isLoading } = useSWR<ProjectReport>("/api/reports", fetcher)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("todos")
  const filtered = useMemo(() => data?.projetos.filter((project) => {
    const matchesText = `${project.nome} ${project.codigo} ${project.areaResponsavel}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (status === "todos" || project.status === status)
  }) ?? [], [data, query, status])

  const exportCsv = () => {
    const lines = ["Projeto,Código,Área,Status,Mapas,Membros", ...filtered.map((project) => [project.nome, project.codigo, project.areaResponsavel, project.status, project.totalMapas, project.totalMembros].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "relatorio-projetos.csv"; link.click(); URL.revokeObjectURL(url)
  }

  if (isLoading) return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Consultas e relatórios</h1><PetrobrasLoading label="Consolidando o portfólio autorizado..." /></main>
  if (error || !data) return <main><p className="text-destructive">Não foi possível carregar o relatório.</p></main>

  const cards = [["Projetos no escopo", data.indicadores.totalProjetos, FolderKanban], ["Projetos ativos", data.indicadores.ativos, BarChart3], ["Mapas catalogados", data.indicadores.totalMapas, Map], ["Membros vinculados", data.indicadores.totalMembros, Users]] as const
  return <main className="flex flex-col gap-6">
    <BackButton />
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">INTELIGÊNCIA DO PORTFÓLIO</p><h1 className="text-3xl font-semibold tracking-tight">Consultas e relatórios</h1><p className="max-w-2xl text-muted-foreground">Leitura executiva do universo de projetos, mapas e pessoas que você está autorizado a consultar.</p></div><Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download data-icon="inline-start" />Exportar CSV</Button></header>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores do portfólio">{cards.map(([label, value, Icon]) => <Card key={label}><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold">{value}</p></div><Icon className="size-5 text-primary" /></CardContent></Card>)}</section>
    <Card><CardHeader className="gap-4"><div><CardTitle>Explorar projetos</CardTitle><CardDescription>Filtre o portfólio e gere uma fotografia operacional para compartilhamento.</CardDescription></div><div className="flex flex-col gap-3 md:flex-row"><Input aria-label="Buscar projeto" placeholder="Buscar por nome, código ou área" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filtrar status" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="todos">Todos os status</option><option value="ativo">Ativos</option><option value="suspenso">Suspensos</option><option value="concluido">Concluídos</option></select><Button variant="ghost" onClick={() => { setQuery(""); setStatus("todos") }}><Filter data-icon="inline-start" />Limpar</Button></div></CardHeader><CardContent><div className="flex flex-col gap-3">{filtered.map((project) => <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4" key={project.id}><div><p className="font-medium">{project.nome}</p><p className="text-sm text-muted-foreground">{project.codigo} · {project.areaResponsavel}</p></div><div className="flex items-center gap-3 text-sm text-muted-foreground"><span>{project.totalMapas} mapas</span><span>{project.totalMembros} membros</span><Badge variant="secondary">{project.status}</Badge></div></div>)}{!filtered.length && <p className="py-8 text-center text-muted-foreground">Nenhum projeto corresponde aos filtros.</p>}</div></CardContent></Card>
  </main>
}
