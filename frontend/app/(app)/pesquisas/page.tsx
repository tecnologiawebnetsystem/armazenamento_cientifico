"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Search, Users, FolderKanban, Files, FolderOpen, ShieldCheck, Clock3 } from "lucide-react"
import { ExportButton, ExportFieldsDialog, type ExportField } from "@/components/export-fields-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { downloadFile, getAccessMap, getAccessMapExportUrl } from "@/lib/api-client"
import type { AccessMapResponse } from "@/lib/types"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { BackButton } from "@/components/navigation/back-button"
import { KpiCards, type KpiItem } from "@/components/dashboard/kpi-cards"

const fetcher = () => getAccessMap()
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })
function safeDate(value?: string | null) {
  if (!value) return "Não informado"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "Não informado" : dateFormat.format(parsed)
}

export default function PesquisasPage() {
  const { data, error, isLoading } = useSWR<AccessMapResponse>("access-map", fetcher)
  const [search, setSearch] = useState("")
  const [type, setType] = useState("todos")
  const [level, setLevel] = useState("todos")
  const [advanced, setAdvanced] = useState(false)
  const [view, setView] = useState("projeto")
  const [exportOpen, setExportOpen] = useState(false)
  const rows = useMemo(() => (data?.rows ?? []).filter((row) => {
    const text = `${row.userName} ${row.userEmail} ${row.projectName} ${row.resourceName}`.toLowerCase()
    return text.includes(search.toLowerCase()) && (type === "todos" || row.resourceType === type) && (level === "todos" || row.accessLevel === level)
  }), [data?.rows, search, type, level])

  if (isLoading) return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Pesquisas</h1><PetrobrasLoading label="Carregando mapa de acessos..." /></main>
  if (error || !data) return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Pesquisas</h1><p className="text-destructive">Não foi possível carregar o mapa de acessos.</p></main>

  const accessMetadata = data as AccessMapResponse & { source?: string; consultedAt?: string }
  const exportFields: ExportField[] = [
    { key: "usuario", label: "Usuário" },
    { key: "email", label: "E-mail" },
    { key: "perfil", label: "Perfil" },
    { key: "area", label: "Área" },
    { key: "projeto", label: "Projeto" },
    { key: "recurso", label: "Recurso" },
    { key: "tipo", label: "Tipo de recurso" },
    { key: "acesso", label: "Nível de acesso" },
    { key: "ultimaVisualizacao", label: "Última visualização" },
  ]
  const exportRows = async (fields: string[], formats: ("csv" | "txt" | "pdf")[]) => {
    for (const format of formats) {
      if (format === "pdf") continue
      const path = getAccessMapExportUrl({ format, fields: fields.join(","), q: search, type, level, view }).replace(/^https?:\/\/[^/]+/, "")
      const blob = await downloadFile(path)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `mapa-de-acessos.${format}`
      link.click()
      URL.revokeObjectURL(url)
    }
  }
  const cards: KpiItem[] = [
    { icon: Users, label: "Usuários no escopo", value: String(data.summary.users), tone: "teal" },
    { icon: FolderKanban, label: "Projetos", value: String(data.summary.projects), tone: "green" },
    { icon: FolderOpen, label: "Pastas", value: String(data.summary.folders), tone: "blue" },
    { icon: Files, label: "Arquivos", value: String(data.summary.files), tone: "yellow" },
  ]

  return <main className="flex flex-col gap-6">
    <header className="flex flex-col gap-4"><BackButton /><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex flex-col gap-2"><div className="flex items-center gap-2"><ShieldCheck className="text-primary" /><span className="text-xs font-semibold uppercase tracking-widest text-primary">Governança de acesso</span></div><h1 className="text-3xl font-semibold tracking-tight text-balance">Mapa de acessos científicos</h1></div><div className="flex flex-wrap gap-2"><ExportButton onClick={() => setExportOpen(true)} /></div></div><p className="max-w-3xl text-muted-foreground leading-relaxed">Pesquise quem acessa cada projeto, pasta e arquivo. A visão respeita o seu perfil e torna a cadeia de acesso auditável em um único lugar.</p><div className="flex flex-wrap gap-3 text-xs text-muted-foreground"><span>Fonte: {accessMetadata.source ?? "SIGAC Directory"}</span><span>Última atualização: {safeDate(accessMetadata.consultedAt)}</span></div></header>
    <section aria-label="Resumo de acessos"><KpiCards items={cards} /></section>
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-background via-background to-petrobras-teal/5 shadow-sm ring-1 ring-petrobras-blue/15"><CardHeader className="border-b border-petrobras-blue/10 bg-gradient-to-r from-petrobras-green/5 via-background to-petrobras-yellow/10"><CardTitle>Mapa relacional</CardTitle><CardDescription>{data.summary.relationships} relações de acesso identificadas no seu escopo.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-2.5 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar usuário, projeto, pasta ou arquivo" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select value={type} onValueChange={(value) => setType(value ?? "todos")}><SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="todos">Todos os recursos</SelectItem><SelectItem value="pasta">Pastas</SelectItem><SelectItem value="arquivo">Arquivos</SelectItem></SelectGroup></SelectContent></Select><Select value={level} onValueChange={(value) => setLevel(value ?? "todos")}><SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Permissão" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="todos">Todos os níveis</SelectItem><SelectItem value="leitura">Leitura</SelectItem><SelectItem value="edicao">Edição</SelectItem><SelectItem value="gerente">Gerente</SelectItem><SelectItem value="participante">Participante</SelectItem></SelectGroup></SelectContent></Select><Button variant="outline" size="sm" onClick={() => setAdvanced((value) => !value)}>Filtros avançados</Button>{advanced && <Select value={view} onValueChange={(value) => setView(value ?? "projeto")}><SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Visão" /></SelectTrigger><SelectContent><SelectItem value="projeto">Por projeto</SelectItem><SelectItem value="usuario">Por usuário</SelectItem><SelectItem value="grupo">Por grupo</SelectItem><SelectItem value="nivel">Por nível de acesso</SelectItem></SelectContent></Select>}</div>
      <div className="flex flex-wrap gap-2"><Badge variant="outline">Visão: {view}</Badge>{rows.some((row) => row.accessLevel === "gerente" && row.resourceType === "arquivo") && <Badge variant="destructive">Conflitos detectados</Badge>}<Badge variant="secondary">{rows.filter((row) => !row.userEmail).length} sem correspondência</Badge></div>
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-background/80 shadow-sm">      <Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Projeto</TableHead><TableHead>Recurso</TableHead><TableHead>Acesso</TableHead><TableHead>Última visualização</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={`${row.userId}-${row.resourceId}`}><TableCell><div className="flex flex-col"><span className="font-medium">{row.userName}</span><span className="text-xs text-muted-foreground">{row.userEmail}</span></div></TableCell><TableCell><div className="flex flex-col"><span>{row.projectName}</span><span className="text-xs text-muted-foreground">{row.projectId}</span></div></TableCell><TableCell><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />{row.resourceName}<span className="text-xs text-muted-foreground">({row.resourceType})</span></div></TableCell><TableCell><Badge variant={row.accessLevel === "edicao" || row.accessLevel === "gerente" ? "default" : "secondary"}>{row.accessLevel}</Badge></TableCell><TableCell><span className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />{safeDate(row.lastViewedAt)}</span></TableCell></TableRow>)}</TableBody></Table></div>{rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum acesso encontrado para os filtros selecionados.</p>}
    </CardContent></Card>
    <ExportFieldsDialog open={exportOpen} onOpenChange={setExportOpen} title="mapa de acessos" fields={exportFields} onConfirm={exportRows} />
  </main>
}
