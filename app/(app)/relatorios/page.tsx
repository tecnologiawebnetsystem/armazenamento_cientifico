"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { BarChart3, Filter, FolderKanban, Map, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getProjectReport } from "@/lib/api-client"
import type { ProjectReport } from "@/lib/types"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { BackButton } from "@/components/navigation/back-button"
import { KpiCards, type KpiItem } from "@/components/dashboard/kpi-cards"
import { ExportButton, ExportFieldsDialog, type ExportField } from "@/components/export-fields-dialog"

const fetcher = () => getProjectReport()

export default function ReportsPage() {
  const { data, error, isLoading } = useSWR<ProjectReport>("/api/reports", fetcher)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("todos")
  const [area, setArea] = useState("todas")
  const [gestor, setGestor] = useState("")
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)
  const exportFields: ExportField[] = [
    { key: "nome", label: "Nome do projeto" }, { key: "codigo", label: "Código" },
    { key: "area", label: "Área responsável" }, { key: "status", label: "Status" },
    { key: "mapas", label: "Mapas" }, { key: "membros", label: "Membros" },
  ]
  const areas = Array.from(new Set(data?.projetos.map((project) => project.areaResponsavel) ?? []))
  const filtered = useMemo(() => data?.projetos.filter((project) => {
    const matchesText = `${project.nome} ${project.codigo} ${project.areaResponsavel}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (status === "todos" || project.status === status) && (area === "todas" || project.areaResponsavel === area) && (!gestor || project.gestoresIds?.some((id) => id.toLowerCase().includes(gestor.toLowerCase())))
  }).sort((a, b) => (sortAsc ? 1 : -1) * a.nome.localeCompare(b.nome, "pt-BR")) ?? [], [data, query, status, area, gestor, sortAsc])
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  const download = (content: string, filename: string, type: string) => { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url) }
  const generateExport = (fields: string[], formats: ("csv" | "txt" | "pdf")[]) => {
    const labels = Object.fromEntries(exportFields.map((field) => [field.key, field.label]))
    const values = (project: ProjectReport["projetos"][number]) => ({ nome: project.nome, codigo: project.codigo, area: project.areaResponsavel, status: project.status, mapas: project.totalMapas, membros: project.totalMembros })
    const rows = filtered.map((project) => fields.map((field) => String(values(project)[field as keyof ReturnType<typeof values>] ?? "")))
    formats.forEach((format) => {
      const content = format === "csv" ? [fields.map((field) => labels[field]).join(","), ...rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))].join("\n") : rows.map((row) => row.join(" | ")).join("\n")
      download(content, `relatorio-projetos.${format}`, format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8")
    })
  }

  if (isLoading) return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Consultas e relatórios</h1><PetrobrasLoading label="Consolidando o portfólio autorizado..." /></main>
  if (error || !data) return <main><p className="text-destructive">Não foi possível carregar o relatório.</p></main>

  const cards: KpiItem[] = [
    { label: "Projetos no escopo", value: String(data.indicadores.totalProjetos), icon: FolderKanban, tone: "green" },
    { label: "Projetos ativos", value: String(data.indicadores.ativos), icon: BarChart3, tone: "teal" },
    { label: "Mapas catalogados", value: String(data.indicadores.totalMapas), icon: Map, tone: "blue" },
    { label: "Membros vinculados", value: String(data.indicadores.totalMembros), icon: Users, tone: "yellow" },
  ]
  return <main className="flex flex-col gap-6">
    <BackButton />
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">INTELIGÊNCIA DO PORTFÓLIO</p><h1 className="text-3xl font-semibold tracking-tight">Consultas e relatórios</h1><p className="max-w-2xl text-muted-foreground">Leitura executiva do universo de projetos, mapas e pessoas que você está autorizado a consultar.</p></div><div className="flex flex-wrap gap-2"><ExportButton onClick={() => setExportOpen(true)} /></div></header>
    <section aria-label="Indicadores do portfólio"><KpiCards items={cards} /></section>
    <Card><CardHeader className="gap-4"><div><CardTitle>Explorar projetos</CardTitle><CardDescription>Filtre o portfólio e gere uma fotografia operacional para compartilhamento.</CardDescription></div><div className="flex flex-col gap-3 md:flex-row"><Input aria-label="Buscar projeto" placeholder="Buscar por nome, código ou área" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /><select aria-label="Filtrar status" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="todos">Todos os status</option><option value="ativo">Ativos</option><option value="suspenso">Suspensos</option><option value="concluido">Concluídos</option></select><select aria-label="Filtrar área" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={area} onChange={(event) => { setArea(event.target.value); setPage(1) }}><option value="todas">Todas as áreas</option>{areas.map((item) => <option key={item} value={item}>{item}</option>)}</select><Input aria-label="Filtrar gestor" placeholder="ID do gestor" value={gestor} onChange={(event) => { setGestor(event.target.value); setPage(1) }} /><Button variant="outline" size="sm" onClick={() => setSortAsc((value) => !value)}>Ordenar {sortAsc ? "A–Z" : "Z–A"}</Button><Button variant="ghost" onClick={() => { setQuery(""); setStatus("todos") }}><Filter data-icon="inline-start" />Limpar</Button></div></CardHeader><CardContent><div className="flex flex-col gap-3">{visible.map((project) => <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4" key={project.id}><div><p className="font-medium">{project.nome}</p><p className="text-sm text-muted-foreground">{project.codigo} · {project.areaResponsavel}</p></div><div className="flex items-center gap-3 text-sm text-muted-foreground"><span>{project.totalMapas} mapas</span><span>{project.totalMembros} membros</span><Badge variant="secondary">{project.status}</Badge></div></div>)}{!filtered.length && <p className="py-8 text-center text-muted-foreground">Nenhum projeto corresponde aos filtros.</p>}</div>{filtered.length > pageSize && <div className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground"><span>Página {page} de {totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</Button></div></div>}</CardContent></Card>
    <ExportFieldsDialog open={exportOpen} onOpenChange={setExportOpen} title="relatório de projetos" fields={exportFields} onConfirm={generateExport} />
  </main>
}
