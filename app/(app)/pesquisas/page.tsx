'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Clock3, Download, Files, FolderKanban, FolderOpen, Search, ShieldCheck, Users, X } from 'lucide-react'
import { ExportButton, ExportFieldsDialog, type ExportField } from '@/components/export-fields-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { downloadFile, getAccessMap, getAccessMapExportUrl, getReportFields } from '@/lib/api-client'
import type { AccessMapResponse } from '@/lib/types'
import { PetrobrasLoading } from '@/components/petrobras-loading'
import { KpiCards, type KpiItem } from '@/components/dashboard/kpi-cards'
import { PageHeader, PageLayout, PageSection } from '@/components/shared/page-layout'

const fetcher = () => getAccessMap()
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function safeDate(value?: string | null) {
  if (!value) return 'Não informado'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Não informado' : dateFormat.format(parsed)
}

function accessLabel(value?: string | null) {
  const key = (value ?? '').trim()
  if (!key) return 'Não definido'
  return ({ gerente: 'Gestão', editor: 'Edição', leitor: 'Leitura', viewer: 'Leitura' }[key.toLowerCase()] ?? key)
}

export default function AccessMapPage() {
  const { data, error, isLoading } = useSWR<AccessMapResponse>('access-map', fetcher)
  const { data: configuredFields } = useSWR('/api/report-fields?report_code=acessos', () => getReportFields('acessos'))
  const [search, setSearch] = useState('')
  const [type, setType] = useState('todos')
  const [level, setLevel] = useState('todos')
  const [area, setArea] = useState('todos')
  const [role, setRole] = useState('todos')
  const [projectStatus, setProjectStatus] = useState('todos')
  const [view, setView] = useState('projeto')
  const [exportOpen, setExportOpen] = useState(false)

  const filterValues = (values: Array<string | null | undefined>) => Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const resourceTypes = useMemo(() => filterValues((data?.rows ?? []).map((row) => row.resourceType)), [data?.rows])
  const accessLevels = useMemo(() => filterValues((data?.rows ?? []).map((row) => row.accessLevel)), [data?.rows])
  const areas = useMemo(() => filterValues((data?.rows ?? []).map((row) => row.area)), [data?.rows])
  const roles = useMemo(() => filterValues((data?.rows ?? []).map((row) => row.userRole)), [data?.rows])
  const projectStatuses = useMemo(() => filterValues((data?.rows ?? []).map((row) => row.projectStatus)), [data?.rows])
  const matchesFilter = (selected: string, current: string | null | undefined) => selected === 'todos' || current?.trim().toLocaleLowerCase('pt-BR') === selected.trim().toLocaleLowerCase('pt-BR')
  const exportFields: ExportField[] = (configuredFields?.fields ?? []).map((field) => ({ key: field.field_key, label: field.label }))
  const hasFilters = Boolean(search.trim()) || [type, level, area, role, projectStatus].some((value) => value !== 'todos')

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return (data?.rows ?? []).filter((row) => {
      const text = `${row.userName} ${row.userEmail} ${row.projectName} ${row.resourceName}`.toLowerCase()
      return (!normalizedSearch || text.includes(normalizedSearch)) &&
        matchesFilter(type, row.resourceType) &&
        matchesFilter(level, row.accessLevel) &&
        matchesFilter(area, row.area) &&
        matchesFilter(role, row.userRole) &&
        matchesFilter(projectStatus, row.projectStatus)
    })
  }, [data?.rows, search, type, level, area, role, projectStatus])

  const clearFilters = () => {
    setSearch('')
    setType('todos')
    setLevel('todos')
    setArea('todos')
    setRole('todos')
    setProjectStatus('todos')
    setView('projeto')
  }

  const exportRows = async (fields: string[], formats: ('csv' | 'txt' | 'pdf')[]) => {
    for (const format of formats) {
      const path = getAccessMapExportUrl({ format, fields: fields.join(','), q: search, type, level, view }).replace(/^https?:\/\/[^/]+/, '')
      const blob = await downloadFile(path)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mapa-de-acessos.${format}`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  if (isLoading) return <PageLayout><PageHeader title="Mapa de acessos" description="Consulte grupos, membros e recursos autorizados por projeto." /><PetrobrasLoading label="Carregando mapa de acessos..." /></PageLayout>
  if (error || !data) return <PageLayout><PageHeader title="Mapa de acessos" /><p className="text-destructive">Não foi possível carregar o mapa de acessos.</p></PageLayout>

  const cards: KpiItem[] = [
    { icon: Users, label: 'Usuários no escopo', value: String(data.summary.users), tone: 'teal' },
    { icon: FolderKanban, label: 'Projetos', value: String(data.summary.projects), tone: 'green' },
    { icon: FolderOpen, label: 'Pastas', value: String(data.summary.folders), tone: 'blue' },
    { icon: Files, label: 'Arquivos', value: String(data.summary.files), tone: 'yellow' },
  ]

  return <PageLayout>
    <PageHeader eyebrow="Governança de acesso" title="Mapa de acessos científicos" description="Use uma única consulta para encontrar quem acessa cada projeto, recurso ou área." actions={<ExportButton onClick={() => setExportOpen(true)} disabled={!exportFields.length || !rows.length} />} />
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-petrobras-green" />Fonte: {data.source}</span><span>Atualizado em {safeDate(data.consultedAt)}</span></div>
    <PageSection label="Panorama do escopo"><KpiCards items={cards} /></PageSection>

    <Card className="sigac-surface overflow-hidden">
      <CardHeader className="sigac-section-header gap-2 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><CardTitle className="text-base">Consultar acessos</CardTitle><CardDescription className="mt-1">Digite uma palavra ou escolha filtros. Os resultados aparecem logo abaixo.</CardDescription></div>
          {hasFilters ? <Button variant="ghost" size="sm" className="w-fit" onClick={clearFilters}><X className="mr-2 size-4" />Limpar filtros</Button> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="access-search" className="text-sm font-medium">O que você quer encontrar?</label>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input id="access-search" aria-label="Buscar acessos" className="bg-background pl-9" placeholder="Digite projeto, usuário, e-mail ou recurso" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <p className="text-xs text-muted-foreground">A busca é aplicada automaticamente em todos os resultados.</p>
        </div>
        <div className="flex flex-col gap-3">
          <div><p className="text-sm font-medium">Filtros da consulta</p><p className="mt-1 text-xs text-muted-foreground">Cada campo abaixo filtra imediatamente a lista de relações autorizadas.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col gap-1.5"><label htmlFor="filter-resource" className="text-xs font-semibold text-foreground">Tipo de recurso</label><Select value={type} onValueChange={(value) => setType(value ?? 'todos')}><SelectTrigger id="filter-resource" className="h-10 w-full bg-background" aria-label="Filtrar por tipo de recurso"><SelectValue placeholder="Todos os recursos" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os recursos</SelectItem>{resourceTypes.map((item) => <SelectItem key={item} value={item}>{item === 'pasta' ? 'Pastas' : item === 'arquivo' ? 'Arquivos' : item}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1.5"><label htmlFor="filter-level" className="text-xs font-semibold text-foreground">Nível de acesso</label><Select value={level} onValueChange={(value) => setLevel(value ?? 'todos')}><SelectTrigger id="filter-level" className="h-10 w-full bg-background" aria-label="Filtrar por nível de acesso"><SelectValue placeholder="Todos os níveis" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os níveis</SelectItem>{accessLevels.map((item) => <SelectItem key={item} value={item}>{accessLabel(item)}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1.5"><label htmlFor="filter-area" className="text-xs font-semibold text-foreground">Área responsável</label><Select value={area} onValueChange={(value) => setArea(value ?? 'todos')}><SelectTrigger id="filter-area" className="h-10 w-full bg-background" aria-label="Filtrar por área responsável"><SelectValue placeholder="Todas as áreas" /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as áreas</SelectItem>{areas.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1.5"><label htmlFor="filter-role" className="text-xs font-semibold text-foreground">Perfil do usuário</label><Select value={role} onValueChange={(value) => setRole(value ?? 'todos')}><SelectTrigger id="filter-role" className="h-10 w-full bg-background" aria-label="Filtrar por perfil do usuário"><SelectValue placeholder="Todos os perfis" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os perfis</SelectItem>{roles.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1.5"><label htmlFor="filter-status" className="text-xs font-semibold text-foreground">Status do projeto</label><Select value={projectStatus} onValueChange={(value) => setProjectStatus(value ?? 'todos')}><SelectTrigger id="filter-status" className="h-10 w-full bg-background" aria-label="Filtrar por status do projeto"><SelectValue placeholder="Todos os status" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os status</SelectItem>{projectStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">Organizar resultados</p><p className="text-xs text-muted-foreground">Escolha como deseja visualizar a mesma lista de acessos.</p></div><div className="flex w-full gap-1 rounded-md border border-input bg-background p-1 sm:w-auto"><Button variant={view === 'projeto' ? 'secondary' : 'ghost'} className="flex-1" size="sm" onClick={() => setView('projeto')}>Por projeto</Button><Button variant={view === 'usuario' ? 'secondary' : 'ghost'} className="flex-1" size="sm" onClick={() => setView('usuario')}>Por usuário</Button></div></div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground"><span>{hasFilters ? 'Filtros aplicados automaticamente' : 'Nenhum filtro aplicado'}</span><span><strong className="font-medium text-foreground">{rows.length}</strong> relações encontradas</span></div>
      </CardContent>
    </Card>

    <Card className="sigac-surface overflow-hidden">
      <CardHeader className="sigac-section-header flex flex-row items-center justify-between gap-3 px-5 py-4"><div><CardTitle className="text-base">Resultados</CardTitle><CardDescription className="mt-1">Lista única de relações autorizadas, sem duplicar a consulta.</CardDescription></div><Badge variant="outline">{rows.length} relações</Badge></CardHeader>
      <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/45 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Usuário</th><th className="px-4 py-3 font-medium">Projeto</th><th className="px-4 py-3 font-medium">Recurso</th><th className="px-4 py-3 font-medium">Acesso</th><th className="px-4 py-3 font-medium">Última visualização</th></tr></thead><tbody className="divide-y divide-border/60">{rows.map((row) => <tr key={`${row.userId}-${row.resourceId}`} className="transition-colors hover:bg-petrobras-green/5"><td className="px-5 py-4"><p className="font-semibold">{row.userName}</p><p className="text-xs text-muted-foreground">{row.userEmail || 'E-mail não informado'}</p></td><td className="px-4 py-4"><p>{row.projectName}</p><p className="font-mono text-xs text-muted-foreground">{row.projectId}</p></td><td className="px-4 py-4"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-petrobras-teal" />{row.resourceName}<span className="text-xs text-muted-foreground">({row.resourceType})</span></div></td><td className="px-4 py-4"><Badge variant={row.accessLevel === 'gerente' ? 'default' : 'secondary'}>{accessLabel(row.accessLevel)}</Badge></td><td className="px-4 py-4 text-muted-foreground"><span className="flex items-center gap-2 whitespace-nowrap"><Clock3 className="size-4" />{safeDate(row.lastViewedAt)}</span></td></tr>)}</tbody></table></div>{!rows.length ? <div className="flex flex-col items-center gap-2 px-6 py-12 text-center"><ShieldCheck className="size-8 text-muted-foreground" /><p className="font-semibold">Nenhum acesso encontrado</p><p className="text-sm text-muted-foreground">Ajuste os filtros ou limpe a consulta para ver outros resultados.</p></div> : null}<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-4 text-xs text-muted-foreground"><span>Visão atual: {view === 'projeto' ? 'por projeto' : 'por usuário'}</span><span className="inline-flex items-center gap-2"><Download className="size-3.5" />A exportação usa os filtros atuais</span></div></CardContent>
    </Card>
    <ExportFieldsDialog open={exportOpen} onOpenChange={setExportOpen} title="mapa de acessos" fields={exportFields} onConfirm={exportRows} />
  </PageLayout>
}
