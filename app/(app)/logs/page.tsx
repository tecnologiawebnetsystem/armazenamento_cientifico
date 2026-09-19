"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { ActivityIcon, DownloadIcon, FilterIcon, RefreshCwIcon, SearchIcon, ShieldCheckIcon, UserRoundIcon, XIcon, type LucideIcon } from "lucide-react"
import { BackButton } from "@/components/navigation/back-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { getActivityLogs } from "@/lib/api-client"
import type { ActivityLog } from "@/lib/types"

const fetcher = () => getActivityLogs({ page: 1, limit: 100 })
type LogWithUser = ActivityLog & { user?: { nome?: string; email?: string } | null }

function downloadCsv(logs: LogWithUser[]) {
  const headers = ["data", "usuario", "acao", "entidade", "identificador", "resultado", "detalhes"]
  const rows = logs.map((log) => [log.criadoEm, log.user?.nome ?? "Usuário do sistema", log.acao, log.entidade, log.entidadeId ?? "", log.resultado ?? "sucesso", log.detalhes ?? ""])
  const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `auditoria-sigac-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export default function LogsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/activity-logs?limit=100", fetcher)
  const [query, setQuery] = useState("")
  const [action, setAction] = useState("todos")
  const allLogs = useMemo(() => (data?.logs ?? []) as LogWithUser[], [data?.logs])
  const actions = useMemo(() => Array.from(new Set(allLogs.map((log) => log.acao))), [allLogs])
  const logs = useMemo(() => allLogs.filter((log) => {
    const text = `${log.acao} ${log.entidade} ${log.entidadeId ?? ""} ${log.user?.nome ?? ""} ${log.user?.email ?? ""}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (action === "todos" || log.acao === action)
  }), [allLogs, query, action])
  const users = new Set(allLogs.map((log) => log.userId)).size
  const errors = allLogs.filter((log) => log.resultado === "erro").length
  const latest = allLogs[0]?.criadoEm
  const metricCards: Array<[string, number, LucideIcon]> = [
    ["Eventos capturados", allLogs.length, ActivityIcon],
    ["Usuários observados", users, UserRoundIcon],
    ["Ações distintas", actions.length, ShieldCheckIcon],
    ["Eventos com erro", errors, errors ? XIcon : ShieldCheckIcon],
  ]

  if (isLoading) return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Central de auditoria</h1><PetrobrasLoading label="Carregando trilha de auditoria..." /></main>
  if (error || !data) return <main className="flex flex-col gap-6"><BackButton /><p className="text-destructive">Não foi possível carregar os logs.</p></main>

  return <main className="flex flex-col gap-6">
    <BackButton />
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-6 shadow-sm md:p-8">
      <div className="absolute inset-y-0 right-0 w-1/3 bg-primary/5 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary"><ActivityIcon className="size-4" /> Observabilidade · trilha ativa</div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Central de auditoria</h1>
          <p className="mt-2 text-muted-foreground">Uma visão operacional das ações realizadas na plataforma, com rastreabilidade por usuário, entidade e resultado.</p>
        </div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void mutate()}><RefreshCwIcon data-icon="inline-start" />Atualizar</Button><Button onClick={() => downloadCsv(logs)} disabled={!logs.length}><DownloadIcon data-icon="inline-start" />Exportar CSV</Button></div>
      </div>
      <div className="relative mt-7 flex flex-wrap gap-x-8 gap-y-3 border-t border-border/70 pt-4 text-xs text-muted-foreground"><span>ÚLTIMA CAPTURA <strong className="ml-1 font-mono text-foreground">{latest ? new Date(latest).toLocaleString("pt-BR") : "—"}</strong></span><span>FONTE <strong className="ml-1 font-mono text-foreground">SIGAC / AUDIT STREAM</strong></span><span className="flex items-center gap-1 text-primary"><span className="size-1.5 rounded-full bg-primary" /> MONITORAMENTO ATIVO</span></div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metricCards.map(([label, value, Icon]) => <Card key={String(label)} className="gap-3 py-4"><CardContent className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 font-mono text-2xl font-semibold">{value}</p></div><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-5" /></div></CardContent></Card>)}
    </section>

    <Card className="overflow-hidden py-0">
      <CardHeader className="gap-4 border-b bg-muted/20 px-5 py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />Fluxo de eventos</CardTitle><p className="mt-1 text-sm text-muted-foreground">{logs.length} registros no recorte atual · até 100 eventos recentes</p></div><Button variant="ghost" size="sm" onClick={() => { setQuery(""); setAction("todos") }} disabled={!query && action === "todos"}><FilterIcon data-icon="inline-start" />Limpar filtros</Button></div><div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" aria-label="Buscar nos logs" placeholder="Buscar usuário, ação, entidade ou identificador" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select aria-label="Filtrar ação" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={action} onChange={(event) => setAction(event.target.value)}><option value="todos">Todas as ações</option>{actions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></CardHeader>
      <CardContent className="p-0"><div className="hidden grid-cols-[1.4fr_1.1fr_1fr_0.8fr_1.2fr] gap-4 border-b bg-muted/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid"><span>Evento / entidade</span><span>Usuário</span><span>Identificador</span><span>Resultado</span><span className="text-right">Data e hora</span></div><div className="divide-y">{logs.length ? logs.map((log) => <div className="grid gap-3 px-5 py-4 transition-colors hover:bg-primary/[0.03] md:grid-cols-[1.4fr_1.1fr_1fr_0.8fr_1.2fr] md:items-center md:gap-4" key={log.id}><div><p className="font-medium">{log.acao}</p><p className="mt-1 text-xs text-muted-foreground">{log.entidade}{log.entidadeId ? ` · ${log.entidadeId}` : ""}</p></div><div className="flex items-center gap-2 text-sm"><span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{(log.user?.nome ?? "S").charAt(0).toUpperCase()}</span><span className="truncate">{log.user?.nome ?? "Usuário do sistema"}</span></div><span className="font-mono text-xs text-muted-foreground">{log.entidadeId || "—"}</span><Badge variant={log.resultado === "erro" ? "destructive" : "secondary"} className="w-fit">{log.resultado ?? "sucesso"}</Badge><time className="text-sm text-muted-foreground md:text-right" dateTime={log.criadoEm}>{new Date(log.criadoEm).toLocaleString("pt-BR")}</time></div>) : <div className="p-12 text-center text-muted-foreground">Nenhum evento encontrado para os filtros informados.</div>}</div></CardContent>
    </Card>
  </main>
}
