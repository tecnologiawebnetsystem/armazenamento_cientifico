"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { BarChart3, Download, Filter, FolderKanban, Map, Search, SlidersHorizontal, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { downloadFile, getCatalogs, getProjectReport, getProjectReportExportPath, getReportFields } from "@/lib/api-client"
import type { ProjectReport } from "@/lib/types"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { KpiCards, type KpiItem } from "@/components/dashboard/kpi-cards"
import { PageHeader, PageLayout, PageSection } from "@/components/shared/page-layout"
import { ExportButton, ExportFieldsDialog, type ExportField } from "@/components/export-fields-dialog"

const fetcher = () => getProjectReport()
type ReportExportFormat = "csv" | "txt" | "pdf"

export default function ReportsPage() {
  const { data, error, isLoading } = useSWR<ProjectReport>("/api/reports", fetcher)
  const { data: catalogs } = useSWR("/api/catalogos", getCatalogs)
  const { data: configuredFields } = useSWR("/api/report-fields?report_code=projetos", () => getReportFields("projetos"))
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("todos")
  const [area, setArea] = useState("todas")
  const [gestor, setGestor] = useState("")
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)
  const statusOptions = catalogs?.statusProjetos.filter((item) => item.ativo).sort((a, b) => a.ordem - b.ordem) ?? []
  const exportFields: ExportField[] = (configuredFields?.fields ?? []).map((field) => ({ key: field.field_key, label: field.label }))
  const areas = Array.from(new Set(data?.projetos.map((project) => project.areaResponsavel) ?? []))
  const filtered = useMemo(() => data?.projetos.filter((project) => {
    const text = `${project.nome} ${project.codigo} ${project.areaResponsavel}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (status === "todos" || project.status === status) && (area === "todas" || project.areaResponsavel === area) && (!gestor || project.gestoresIds?.some((id) => id.toLowerCase().includes(gestor.toLowerCase())))
  }).sort((a, b) => (sortAsc ? -1 : 1) * a.nome.localeCompare(b.nome, "pt-BR")) ?? [], [data, query, status, area, gestor, sortAsc])
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const clearFilters = () => { setQuery(""); setStatus("todos"); setArea("todas"); setGestor(""); setPage(1) }
  const downloadExport = async (format: ReportExportFormat, fields: string[]) => {
    const path = getProjectReportExportPath({ format, fields, status: status === "todos" ? undefined : status, area: area === "todas" ? undefined : area, gestorId: gestor || undefined })
    const blob = await downloadFile(path); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `relatorio-projetos.${format}`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
  }
  const cards: KpiItem[] = data ? [
    { label: "Projetos no escopo", value: String(data.indicadores.totalProjetos), icon: FolderKanban, tone: "green" },
    { label: "Projetos ativos", value: String(data.indicadores.ativos), icon: BarChart3, tone: "teal" },
    { label: "Mapas catalogados", value: String(data.indicadores.totalMapas), icon: Map, tone: "blue" },
    { label: "Membros vinculados", value: String(data.indicadores.totalMembros), icon: Users, tone: "yellow" },
  ] : []
  if (isLoading) return <PageLayout back><PageHeader title="Consultas e relatórios" description="Leitura executiva do universo autorizado." /><PetrobrasLoading label="Consolidando o portfólio autorizado..." /></PageLayout>
  if (error || !data) return <PageLayout back><PageHeader title="Consultas e relatórios" /><p className="text-destructive">Não foi possível carregar o relatório.</p></PageLayout>
  return <PageLayout back>
    <PageHeader eyebrow="Inteligência do portfólio" title="Consultas e relatórios" description="Uma visão clara para explorar projetos autorizados, comparar indicadores e exportar recortes confiáveis." actions={<ExportButton onClick={() => setExportOpen(true)} disabled={!exportFields.length} />} />
    <PageSection label="Visão geral"><KpiCards items={cards} /></PageSection>
    <div className="grid gap-4 lg:grid-cols-2"><Card className="sigac-surface"><CardHeader><CardTitle className="text-base">Distribuição por área</CardTitle><CardDescription>Quantidade de projetos no recorte atual.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{data.porArea.length ? data.porArea.map((item) => <div key={item.area} className="flex items-center gap-3"><span className="w-36 truncate text-sm text-muted-foreground">{item.area}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, Math.round((item.total / Math.max(data.indicadores.totalProjetos, 1)) * 100))}%` }} /></div><span className="w-8 text-right font-mono text-sm font-semibold">{item.total}</span></div>) : <p className="text-sm text-muted-foreground">Sem distribuição disponível para o recorte.</p>}</CardContent></Card><Card className="sigac-surface"><CardHeader><CardTitle className="text-base">Distribuição por status</CardTitle><CardDescription>Acompanhamento do ciclo de vida dos projetos.</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">{data.porStatus.map((item) => <div key={item.status} className="rounded-xl border border-border/70 bg-muted/20 p-3"><p className="truncate text-xs text-muted-foreground">{item.status}</p><p className="mt-1 font-mono text-xl font-semibold">{item.total}</p></div>)}</CardContent></Card></div>
    <Card className="sigac-surface overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-gradient-to-r from-petrobras-green/8 via-background to-petrobras-yellow/10 pb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-petrobras-green"><SlidersHorizontal className="size-4" />Painel de pesquisa</div><CardTitle>Explorar projetos</CardTitle><CardDescription className="mt-1">Use os filtros para montar uma visão operacional sob medida.</CardDescription></div><Badge variant="outline" className="w-fit bg-background/70">{filtered.length} resultados</Badge></div>
        <div className="grid gap-3 pt-2 md:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(150px,1fr))]">
          <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="bg-background/80 pl-9" aria-label="Buscar projeto" placeholder="Nome, código ou área" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} /></div>
          <select aria-label="Filtrar status" className="h-9 rounded-md border border-input bg-background/80 px-3 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="todos">Todos os status</option>{statusOptions.map((item) => <option key={item.codigo} value={item.codigo}>{item.nome}</option>)}</select>
          <select aria-label="Filtrar área" className="h-9 rounded-md border border-input bg-background/80 px-3 text-sm" value={area} onChange={(e) => { setArea(e.target.value); setPage(1) }}><option value="todas">Todas as áreas</option>{areas.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <Input aria-label="Filtrar gestor" className="bg-background/80" placeholder="ID do gestor" value={gestor} onChange={(e) => { setGestor(e.target.value); setPage(1) }} />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1"><Button variant="outline" size="sm" onClick={() => setSortAsc((value) => !value)}>Ordenação: {sortAsc ? "A–Z" : "Z–A"}</Button><Button variant="ghost" size="sm" onClick={clearFilters}><Filter className="mr-2 size-4" />Limpar filtros</Button>{(query || status !== "todos" || area !== "todas" || gestor) && <span className="text-xs text-muted-foreground">Filtros ativos aplicados à exportação</span>}</div>
      </CardHeader>
      <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/45 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-6 py-3 font-medium">Projeto</th><th className="px-4 py-3 font-medium">Área responsável</th><th className="px-4 py-3 font-medium">Cobertura</th><th className="px-4 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-border/60">{visible.map((project) => <tr key={project.id} className="transition-colors hover:bg-petrobras-green/5"><td className="px-6 py-4"><p className="font-semibold text-foreground">{project.nome}</p><p className="font-mono text-xs text-muted-foreground">{project.codigo}</p></td><td className="px-4 py-4 text-muted-foreground">{project.areaResponsavel}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{project.totalMapas} mapas</span><span>{project.totalMembros} membros</span></div></td><td className="px-4 py-4"><Badge variant="secondary">{project.status}</Badge></td></tr>)}</tbody></table></div>{!visible.length && <p className="px-6 py-12 text-center text-sm text-muted-foreground">Nenhum projeto encontrado para os filtros selecionados.</p>}<div className="flex flex-col gap-3 border-t border-border/70 px-6 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Mostrando {visible.length} de {filtered.length} projetos</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="min-w-20 text-center text-xs">Página {page} de {totalPages}</span><Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</Button></div></div></CardContent>
    </Card>
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Download className="size-3.5" />A exportação respeita os filtros ativos e permite selecionar campos e formatos.</div>
    <ExportFieldsDialog open={exportOpen} onOpenChange={setExportOpen} title="relatório de projetos" fields={exportFields} onConfirm={(fields, formats) => void Promise.all(formats.map((format) => downloadExport(format, fields)))} />
  </PageLayout>
}
