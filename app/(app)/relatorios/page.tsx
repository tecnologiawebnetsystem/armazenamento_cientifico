"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { AlertTriangle, Filter, Search, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AUDIT_ACTIONS } from "@/lib/audit"
import { downloadFile, getCatalogs, getInconsistencyReport, getProjectReport, getProjectReportExportPath, getReportFields, getReportGroups, getReportMembers, getResponsibleAreas, recordAuditEvent } from "@/lib/api-client"
import type { ProjectReport } from "@/lib/types"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { PageHeader, PageLayout } from "@/components/shared/page-layout"
import { ExportButton, ExportFieldsDialog, type ExportField } from "@/components/export-fields-dialog"

type ReportExportFormat = "csv" | "txt" | "pdf"
type ReportTab = "areas" | "inconsistencias" | "grupos" | "membros"
const csvValue = (value: string) => {
  const safeValue = /^[=+@\t\r-]/.test(value) ? `'${value}` : value
  return `"${safeValue.replaceAll('"', '""')}"`
}

export default function ReportsPage() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("todos")
  const [area, setArea] = useState("todas")
  const [gestor, setGestor] = useState("")
  const [activeTab, setActiveTab] = useState<ReportTab>("areas")
  const [memberSearch, setMemberSearch] = useState("")
  const [memberPage, setMemberPage] = useState(1)
  const [groupSearch, setGroupSearch] = useState("")
  const [groupArea, setGroupArea] = useState("todas")
  const [groupType, setGroupType] = useState("todos")
  const [groupLevel, setGroupLevel] = useState("todos")
  const [groupPage, setGroupPage] = useState(1)
  const { data, error, isLoading } = useSWR<ProjectReport>(["/api/reports", status, area, gestor], () => getProjectReport({ status: status === "todos" ? undefined : status, area: area === "todas" ? undefined : area, gestorId: gestor || undefined }))
  const { data: catalogs } = useSWR("/api/catalogos", getCatalogs)
  const { data: responsibleAreas } = useSWR("/api/projects/areas", getResponsibleAreas)
  const { data: inconsistencies } = useSWR(["/api/reports/inconsistencies", area, gestor], () => getInconsistencyReport({ area: area === "todas" ? undefined : area, gestorId: gestor || undefined }))
  const { data: groupReport, isLoading: groupsLoading } = useSWR(
    ["/api/reports/groups", groupSearch, groupArea, groupType, groupLevel],
    () => getReportGroups({
      q: groupSearch || undefined,
      area: groupArea === "todas" ? undefined : groupArea,
      principalType: groupType === "todos" ? undefined : groupType as "group" | "role",
      nivel: groupLevel === "todos" ? undefined : groupLevel as "leitura" | "escrita" | "administrador",
    }),
  )
  const { data: memberReport, isLoading: membersLoading } = useSWR(
    ["/api/reports/members", memberSearch],
    () => getReportMembers({ q: memberSearch || undefined }),
  )
  const { data: configuredFields } = useSWR("/api/report-fields?report_code=projetos", () => getReportFields("projetos"))
  useEffect(() => {
    void recordAuditEvent({ action: AUDIT_ACTIONS.REPORT_GENERATED, entity: "relatorio_projetos", entity_id: "projetos", details: { rota: "/relatorios" } }).catch(() => undefined)
  }, [])
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)
  const statusOptions = useMemo(() => catalogs?.statusProjetos.filter((item) => item.ativo).toSorted((a, b) => a.ordem - b.ordem) ?? [], [catalogs?.statusProjetos])
  const exportFields: ExportField[] = (configuredFields?.fields?.length ? configuredFields.fields : [
    { field_key: "nome", label: "Área de rede" },
    { field_key: "codigo", label: "Código" },
    { field_key: "areaResponsavel", label: "Área (gerência) responsável" },
    { field_key: "responsaveis", label: "Responsável" },
    { field_key: "status", label: "Status" },
  ]).map((field) => ({ key: field.field_key, label: field.label }))
  const areas = useMemo(() => (responsibleAreas?.areas ?? []).toSorted((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [responsibleAreas?.areas])
  const filtered = useMemo(() => data?.projetos.filter((project) => {
    const text = `${project.nome} ${project.codigo} ${project.areaResponsavel} ${(project.responsaveis ?? []).join(" ")}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (status === "todos" || project.status === status) && (area === "todas" || project.areaResponsavel === area || project.areaResponsavel === areas.find((item) => item.id === area)?.nome) && (!gestor || (project.responsaveis ?? project.gestoresIds ?? []).some((id) => id.toLowerCase().includes(gestor.toLowerCase())))
  }).toSorted((a, b) => (sortAsc ? -1 : 1) * a.nome.localeCompare(b.nome, "pt-BR")) ?? [], [data, query, status, area, areas, gestor, sortAsc])
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const groupRows = groupReport?.grupos ?? []
  const groupPageSize = 10
  const groupTotalPages = Math.max(1, Math.ceil(groupRows.length / groupPageSize))
  const visibleGroupRows = groupRows.slice((groupPage - 1) * groupPageSize, groupPage * groupPageSize)
  const memberRows = memberReport?.membros ?? []
  const memberPageSize = 10
  const memberTotalPages = Math.max(1, Math.ceil(memberRows.length / memberPageSize))
  const visibleMemberRows = memberRows.slice((memberPage - 1) * memberPageSize, memberPage * memberPageSize)
  const exportGroupsCsv = () => {
    const columns = [
      { key: "grupo", label: "Grupo" },
      { key: "identificador", label: "Identificador do grupo" },
      { key: "tipo", label: "Tipo de principal" },
      { key: "nivel", label: "Permissão" },
      { key: "area", label: "Área de rede" },
      { key: "projeto", label: "Projeto" },
      { key: "codigo", label: "Código do projeto" },
    ] as const
    const rows = groupRows.map((row) => columns.map(({ key }) => {
      const value = key === "tipo"
        ? row.tipo === "role" ? "Role" : "Grupo"
        : key === "nivel"
          ? `${row.nivel.charAt(0).toUpperCase()}${row.nivel.slice(1)}`
          : String(row[key] ?? "")
      return csvValue(value)
    }).join(";"))
    const content = [columns.map(({ label }) => csvValue(label)).join(";"), ...rows].join("\r\n")
    const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "relatorio-grupos-por-area.csv"
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }
  const exportMembersCsv = () => {
    const columns = [
      { key: "nome", label: "Nome" },
      { key: "usuario", label: "Chave" },
      { key: "email", label: "E-mail" },
      { key: "area", label: "Área de rede" },
      { key: "grupo", label: "Grupo" },
      { key: "nivel", label: "Nível de acesso" },
      { key: "projeto", label: "Projeto" },
      { key: "codigo", label: "Código do projeto" },
      { key: "papel", label: "Papel SIGAC" },
      { key: "adicionadoEm", label: "Acesso atualizado em" },
    ] as const
    const rows = memberRows.flatMap((member) => {
      const links = member.vinculos.length ? member.vinculos : [undefined]
      return links.map((access) => {
        const values: Record<string, string | null | undefined> = {
          nome: member.nome,
          usuario: member.usuario,
          email: member.email,
          area: access?.area,
          grupo: access?.grupo,
          nivel: access?.nivel,
          projeto: access?.projeto,
          codigo: access?.codigo,
          papel: access?.papel,
          adicionadoEm: access?.adicionadoEm,
        }
        return columns.map(({ key }) => csvValue(String(values[key] ?? ""))).join(";")
      })
    })
    const content = [columns.map(({ label }) => csvValue(label)).join(";"), ...rows].join("\r\n")
    const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "relatorio-membros.csv"
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }
  const clearFilters = () => { setQuery(""); setStatus("todos"); setArea("todas"); setGestor(""); setPage(1) }
  const downloadExport = async (format: ReportExportFormat, fields: string[]) => {
    const path = getProjectReportExportPath({ format, fields, status: status === "todos" ? undefined : status, area: area === "todas" ? undefined : area, gestorId: gestor || undefined })
    const blob = await downloadFile(path); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `relatorio-projetos.${format}`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
    await recordAuditEvent({ action: AUDIT_ACTIONS.REPORT_EXPORTED, entity: "relatorio_projetos", entity_id: `projetos.${format}`, details: { formato: format, filtros: { status, area, gestorId: gestor || null }, campos: fields } }).catch(() => undefined)
  }
  if (isLoading) return <PageLayout><PageHeader eyebrow="Gestão e análise" title="Relatórios" description="Leitura executiva do universo autorizado." /><PetrobrasLoading label="Consolidando o portfólio autorizado..." /></PageLayout>
  if (error || !data) return <PageLayout><PageHeader title="Consultas e relatórios" /><p className="text-destructive">Não foi possível carregar o relatório.</p></PageLayout>
  return <PageLayout>
    <PageHeader eyebrow="Inteligência do portfólio" title="Consultas e relatórios" description="Consulte áreas de rede, membros autorizados e vínculos de grupos e papéis, em relatórios separados." actions={<div className="flex flex-wrap gap-2">{activeTab === "grupos" ? <ExportButton onClick={exportGroupsCsv} disabled={!groupRows.length} /> : activeTab === "membros" ? <ExportButton onClick={exportMembersCsv} disabled={!memberRows.length} /> : <ExportButton onClick={() => setExportOpen(true)} disabled={!exportFields.length} />}</div>} />
    <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-muted/35 p-1" role="tablist" aria-label="Seções do relatório">
      <button type="button" role="tab" aria-selected={activeTab === "areas"} onClick={() => setActiveTab("areas")} className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "areas" ? "bg-background text-petrobras-green shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Áreas de rede</button>
      <button type="button" role="tab" aria-selected={activeTab === "inconsistencias"} onClick={() => setActiveTab("inconsistencias")} className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "inconsistencias" ? "bg-background text-amber-700 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Inconsistências <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{inconsistencies?.total ?? 0}</span></button>
      <button type="button" role="tab" aria-selected={activeTab === "grupos"} onClick={() => setActiveTab("grupos")} className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "grupos" ? "bg-background text-petrobras-green shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Grupos / Papéis <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{groupReport?.total ?? 0}</span></button>
      <button type="button" role="tab" aria-selected={activeTab === "membros"} onClick={() => setActiveTab("membros")} className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${activeTab === "membros" ? "bg-background text-petrobras-green shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Membros <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{memberReport?.total ?? 0}</span></button>
    </div>
    {activeTab === "areas" && <Card className="sigac-surface overflow-hidden">
      <CardHeader className="sigac-section-header border-b border-border/70 pb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-petrobras-green"><SlidersHorizontal className="size-4" />Painel de pesquisa</div><CardTitle>Filtros da consulta</CardTitle><CardDescription className="mt-1">Combine área, status e responsável para encontrar exatamente o que precisa.</CardDescription></div><Badge variant="outline" className="w-fit bg-background/70">{filtered.length} resultados</Badge></div>
        <div className="grid gap-3 pt-2 md:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(150px,1fr))]">
          <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="bg-background/80 pl-9" aria-label="Buscar área de rede" placeholder="Buscar por nome, código ou área" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} /></div>
          <select aria-label="Filtrar status" className="h-9 rounded-md border border-input bg-background/80 px-3 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="todos">Todos os status</option>{statusOptions.map((item) => <option key={item.codigo} value={item.codigo}>{item.nome}</option>)}</select>
          <select aria-label="Filtrar área" className="h-9 rounded-md border border-input bg-background/80 px-3 text-sm" value={area} onChange={(e) => { setArea(e.target.value); setPage(1) }}><option value="todas">Todas as áreas</option>{areas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>
          <Input aria-label="Filtrar responsável" className="bg-background/80" placeholder="Nome ou ID do responsável" value={gestor} onChange={(e) => { setGestor(e.target.value); setPage(1) }} />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1"><Button variant="outline" size="sm" onClick={() => setSortAsc((value) => !value)}>Ordenação: {sortAsc ? "A–Z" : "Z–A"}</Button><Button variant="ghost" size="sm" onClick={clearFilters}><Filter className="mr-2 size-4" />Limpar filtros</Button>{(query || status !== "todos" || area !== "todas" || gestor) && <span className="text-xs text-muted-foreground">Filtros ativos aplicados à exportação</span>}</div>
      </CardHeader>
      <CardContent className="p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-6 py-3"><p className="text-sm text-muted-foreground"><strong className="text-foreground">{filtered.length}</strong> {filtered.length === 1 ? "área de rede encontrada" : "áreas de rede encontradas"}</p><p className="text-xs text-muted-foreground">Os dados refletem a base cadastrada</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/55 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-6 py-3 font-medium">Área de Rede</th><th className="px-4 py-3 font-medium">Área responsável</th><th className="px-4 py-3 font-medium">Responsável</th><th className="px-4 py-3 font-medium">Caminho</th><th className="px-4 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-border/60">{visible.map((project) => <tr key={project.id} className="transition-colors hover:bg-petrobras-green/5"><td className="px-6 py-4"><p className="font-semibold text-foreground">{project.nome}</p><p className="font-mono text-xs text-muted-foreground">{project.codigo}</p></td><td className="px-4 py-4 text-muted-foreground">{project.areaResponsavel || "Não informada"}</td><td className="px-4 py-4 text-muted-foreground">{project.responsaveis?.join(", ") || "Não informado"}</td><td className="px-4 py-4 text-xs text-muted-foreground"><span className="break-words">{project.pastaMae || "Não informado"}</span></td><td className="px-4 py-4"><Badge variant="secondary">{project.status}</Badge></td></tr>)}</tbody></table></div>{!visible.length && <p className="px-6 py-12 text-center text-sm text-muted-foreground">Nenhuma área de rede encontrado para os filtros selecionados.</p>}<div className="flex flex-col gap-3 border-t border-border/70 px-6 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Mostrando {visible.length} de {filtered.length} área de rede</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="min-w-20 text-center text-xs">Página {page} de {totalPages}</span><Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</Button></div></div></CardContent>
    </Card>}
    {activeTab === "inconsistencias" && <Card className="sigac-surface overflow-hidden">
      <CardHeader className="sigac-section-header border-b border-border/70 pb-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700"><AlertTriangle className="size-4" />Qualidade dos relacionamentos</div><CardTitle>Inconsistências de áreas, áreas de rede e grupos</CardTitle><CardDescription className="mt-1">Áreas de Rede sem grupos de leitura ou escrita mapeados.</CardDescription></div><Badge variant="outline" className="w-fit">{inconsistencies?.total ?? 0} inconsistências</Badge></div><div className="grid gap-3 pt-2 md:grid-cols-2"><Input aria-label="Filtrar gestor das inconsistências" className="bg-background/80" placeholder="Gestor ou ID do responsável" value={gestor} onChange={(e) => setGestor(e.target.value)} /><select aria-label="Filtrar área das inconsistências" className="h-9 rounded-md border border-input bg-background/80 px-3 text-sm" value={area} onChange={(e) => setArea(e.target.value)}><option value="todas">Todas as áreas</option>{areas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div></CardHeader>
      <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/55 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-6 py-3 font-medium">Área</th><th className="px-4 py-3 font-medium">Área de Rede</th><th className="px-4 py-3 font-medium">Grupo</th><th className="px-4 py-3 font-medium">Orientação</th></tr></thead><tbody className="divide-y divide-border/60">{(inconsistencies?.inconsistencias ?? []).map((item) => <tr key={`${item.areaId}-${item.projetoId ?? item.tipo}`} className="hover:bg-amber-500/5"><td className="px-6 py-4 font-medium">{item.area}</td><td className="px-4 py-4">{item.projeto ? <><span className="font-semibold">{item.projeto}</span><span className="block font-mono text-xs text-muted-foreground">{item.codigo}</span></> : "—"}</td><td className="px-4 py-4 text-muted-foreground">{item.grupo || "Nenhum grupo mapeado"}</td><td className="px-4 py-4 text-muted-foreground">{item.descricao}</td></tr>)}</tbody></table></div>{!inconsistencies?.inconsistencias.length && <p className="px-6 py-10 text-center text-sm text-muted-foreground">Nenhuma inconsistência encontrada para os filtros selecionados.</p>}</CardContent>
    </Card>}
    {activeTab === "grupos" && <Card className="sigac-surface overflow-hidden">
      <CardHeader className="sigac-section-header border-b border-border/70 pb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-petrobras-green"><SlidersHorizontal className="size-4" />Painel de pesquisa</div><CardTitle>Grupos e áreas de rede</CardTitle><CardDescription className="mt-1">Consulte os grupos e roles associados às áreas de rede e seus níveis de acesso.</CardDescription></div><Badge variant="outline" className="w-fit bg-background/70">{groupReport?.total ?? 0} resultados</Badge></div>
        <div className="grid gap-3 pt-2 md:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(150px,1fr))]">
          <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="bg-background/80 pl-9" aria-label="Buscar grupos" placeholder="Buscar grupo, identificador, área ou projeto" value={groupSearch} onChange={(event) => { setGroupSearch(event.target.value); setGroupPage(1) }} /></div>
          <select aria-label="Filtrar área de rede dos grupos" className="h-9 rounded-md border border-input bg-background/80 px-3 text-sm" value={groupArea} onChange={(event) => { setGroupArea(event.target.value); setGroupPage(1) }}><option value="todas">Todas as áreas</option>{areas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>
          <select aria-label="Filtrar tipo de principal" className="h-9 rounded-md border border-input bg-background/80 px-3 text-sm" value={groupType} onChange={(event) => { setGroupType(event.target.value); setGroupPage(1) }}><option value="todos">Grupos e roles</option><option value="group">Grupos</option><option value="role">Roles</option></select>
          <select aria-label="Filtrar nível de acesso" className="h-9 rounded-md border border-input bg-background/80 px-3 text-sm" value={groupLevel} onChange={(event) => { setGroupLevel(event.target.value); setGroupPage(1) }}><option value="todos">Todos os níveis</option><option value="leitura">Leitura</option><option value="escrita">Escrita</option><option value="administrador">Administrador</option></select>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1"><Button variant="ghost" size="sm" onClick={() => { setGroupSearch(""); setGroupArea("todas"); setGroupType("todos"); setGroupLevel("todos"); setGroupPage(1) }}><Filter className="mr-2 size-4" />Limpar filtros</Button><span className="text-xs text-muted-foreground">A lista respeita as permissões de acesso às áreas de rede.</span></div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-6 py-3"><p className="text-sm text-muted-foreground"><strong className="text-foreground">{groupReport?.total ?? 0}</strong> {(groupReport?.total ?? 0) === 1 ? "associação encontrada" : "associações encontradas"}</p><p className="text-xs text-muted-foreground">Cada linha representa um grupo vinculado a uma área de rede</p></div>
        {groupsLoading && !groupReport ? <div className="px-6 py-10"><PetrobrasLoading label="Consultando grupos associados..." /></div> : <><div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Grupos e roles vinculados às áreas de rede</caption><thead className="bg-muted/55 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-6 py-3 font-medium">Grupo / role</th><th className="px-4 py-3 font-medium">Identificador</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Nível</th><th className="px-4 py-3 font-medium">Área de rede</th></tr></thead><tbody className="divide-y divide-border/60">{visibleGroupRows.map((item) => <tr key={`${item.projetoId}-${item.id}`} className="transition-colors hover:bg-petrobras-green/5"><td className="px-6 py-4"><p className="font-semibold text-foreground">{item.grupo}</p><p className="text-xs text-muted-foreground">{item.projeto} · {item.codigo}</p></td><td className="px-4 py-4 font-mono text-xs text-muted-foreground">{item.identificador}</td><td className="px-4 py-4"><Badge variant="outline">{item.tipo === "role" ? "Role" : "Grupo"}</Badge></td><td className="px-4 py-4"><Badge variant="secondary" className="capitalize">{item.nivel}</Badge></td><td className="px-4 py-4 text-muted-foreground">{item.area || "Não informada"}</td></tr>)}</tbody></table></div>{!visibleGroupRows.length && <p className="px-6 py-12 text-center text-sm text-muted-foreground">Nenhum grupo encontrado para os filtros selecionados.</p>}</>}
        <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Mostrando {visibleGroupRows.length} de {groupRows.length} associações</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={groupPage <= 1} onClick={() => setGroupPage((value) => Math.max(1, value - 1))}>Anterior</Button><span>Página {groupPage} de {groupTotalPages}</span><Button variant="outline" size="sm" disabled={groupPage >= groupTotalPages} onClick={() => setGroupPage((value) => Math.min(groupTotalPages, value + 1))}>Próxima</Button></div></div>
      </CardContent>
    </Card>}
    {activeTab === "membros" && <Card className="sigac-surface overflow-hidden">
      <CardHeader className="sigac-section-header border-b border-border/70 pb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-petrobras-green"><SlidersHorizontal className="size-4" />Diretório completo</div><CardTitle>Todos os membros</CardTitle><CardDescription className="mt-1">Pesquise pela chave ou nome. Cada pessoa aparece uma vez, com todos os grupos, áreas e níveis de acesso associados.</CardDescription></div><Badge variant="outline" className="w-fit bg-background/70">{memberReport?.total ?? 0} membros</Badge></div>
        <div className="relative pt-2"><Search className="absolute left-3 top-4.5 size-4 text-muted-foreground" /><Input className="bg-background/80 pl-9" aria-label="Buscar membros por chave ou nome" placeholder="Buscar pela chave ou nome do membro" value={memberSearch} onChange={(event) => { setMemberSearch(event.target.value); setMemberPage(1) }} /></div>
        <div className="flex flex-wrap items-center gap-2 pt-1"><Button variant="ghost" size="sm" onClick={() => { setMemberSearch(""); setMemberPage(1) }}><Filter className="mr-2 size-4" />Limpar busca</Button><span className="text-xs text-muted-foreground">A busca percorre todos os membros cadastrados, sem filtrar por área de rede.</span></div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-6 py-3"><p className="text-sm text-muted-foreground"><strong className="text-foreground">{memberReport?.total ?? 0}</strong> {(memberReport?.total ?? 0) === 1 ? "membro encontrado" : "membros encontrados"}</p><p className="text-xs text-muted-foreground">Uma linha por chave; os vínculos são consolidados abaixo</p></div>
        {membersLoading && !memberReport ? <div className="px-6 py-10"><PetrobrasLoading label="Consultando diretório de membros..." /></div> : <><div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Diretório de membros e seus vínculos de acesso</caption><thead className="bg-muted/55 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-6 py-3 font-medium">Membro / chave</th><th className="px-4 py-3 font-medium">E-mail</th><th className="px-4 py-3 font-medium">Áreas, grupos e acessos</th></tr></thead><tbody className="divide-y divide-border/60">{visibleMemberRows.map((item) => <tr key={item.id} className="align-top transition-colors hover:bg-petrobras-green/5"><td className="min-w-52 px-6 py-4"><p className="font-semibold text-foreground">{item.nome || item.usuario}</p><p className="font-mono text-xs text-muted-foreground">{item.usuario}</p></td><td className="min-w-52 px-4 py-4 text-muted-foreground">{item.email || "E-mail não informado"}</td><td className="px-4 py-4 text-muted-foreground">{item.perfil || "Não informado"}</td><td className="min-w-80 px-4 py-3"><div className="flex flex-col gap-2">{item.vinculos.length ? item.vinculos.map((access) => <div key={`${access.projetoId}-${access.grupo}-${access.papel}`} className="rounded-md bg-muted/40 px-3 py-2"><p className="font-medium text-foreground">{access.area || "Área não informada"}{access.grupo ? ` · ${access.grupo}` : " · Acesso direto"}</p><p className="text-xs text-muted-foreground">{[access.projeto, access.codigo].filter(Boolean).join(" · ") || "Projeto não informado"}{access.nivel ? ` · Nível: ${access.nivel}` : ""}{access.papel ? ` · Papel: ${access.papel}` : ""}</p></div>) : <span className="text-muted-foreground">Nenhum vínculo de acesso informado</span>}</div></td></tr>)}</tbody></table></div>{!visibleMemberRows.length && <p className="px-6 py-12 text-center text-sm text-muted-foreground">Nenhum membro encontrado para a chave ou nome pesquisado.</p>}</>}
        <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Mostrando {visibleMemberRows.length} de {memberRows.length} membros</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={memberPage <= 1} onClick={() => setMemberPage((value) => Math.max(1, value - 1))}>Anterior</Button><span>Página {memberPage} de {memberTotalPages}</span><Button variant="outline" size="sm" disabled={memberPage >= memberTotalPages} onClick={() => setMemberPage((value) => Math.min(memberTotalPages, value + 1))}>Próxima</Button></div></div>
      </CardContent>
    </Card>}
    <ExportFieldsDialog open={exportOpen} onOpenChange={setExportOpen} title="relatório de área de rede" fields={exportFields} onConfirm={(fields, formats) => void Promise.all(formats.map((format) => downloadExport(format, fields)))} />
  </PageLayout>
}
