"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import useSWR from "swr"
import { ActivityIcon, DownloadIcon, EyeIcon, FilterIcon, RefreshCwIcon, SearchIcon, ShieldCheckIcon, UserRoundIcon, XIcon, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { getActivityLogs, recordAuditEvent } from "@/lib/api-client"
import type { ActivityLog } from "@/lib/types"

const fetcher = () => getActivityLogs({ page: 1, limit: 100 })
type LogWithUser = ActivityLog & { userName?: string | null; userEmail?: string | null }

async function downloadCsv(logs: LogWithUser[]) {
  const headers = ["data", "usuario", "acao", "entidade", "identificador", "resultado", "detalhes"]
  const rows = logs.map((log) => [log.criadoEm, log.userName ?? log.userId ?? "Usuário não identificado", log.acao, log.entidade, log.entidadeId ?? "", log.resultado ?? "sucesso", log.detalhes ?? ""])
  const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n")
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `auditoria-sigac-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
  await recordAuditEvent({ action: "exportacao", entity: "logs_auditoria", details: { formato: "csv", quantidade: logs.length } }).catch(() => undefined)
}

export default function LogsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/activity-logs?limit=100", fetcher)
  const [query, setQuery] = useState("")
  const [action, setAction] = useState("todos")
  const [entity, setEntity] = useState("todos")
  const [result, setResult] = useState("todos")
  const [selectedLog, setSelectedLog] = useState<LogWithUser | null>(null)
  const allLogs = useMemo(() => (data?.logs ?? []) as LogWithUser[], [data?.logs])
  const actions = useMemo(() => Array.from(new Set(allLogs.map((log) => log.acao))), [allLogs])
  const entities = useMemo(() => Array.from(new Set(allLogs.map((log) => log.entidade))), [allLogs])
  const logs = useMemo(() => allLogs.filter((log) => {
    const text = `${log.acao} ${log.entidade} ${log.entidadeId ?? ""} ${log.userId ?? ""} ${log.userName ?? ""} ${log.userEmail ?? ""} ${log.detalhes ?? ""}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (action === "todos" || log.acao === action) && (entity === "todos" || log.entidade === entity) && (result === "todos" || (log.resultado ?? "sucesso") === result)
  }), [allLogs, query, action, entity, result])
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
  if (error || !data) return <main className="flex flex-col gap-6"><p className="text-destructive">Não foi possível carregar os logs.</p></main>

  return <main className="flex flex-col gap-6">
    <section className="sigac-surface relative overflow-hidden rounded-xl border-l-4 border-l-primary shadow-sm">
      <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-primary/[0.04] [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)] md:block" />
      <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><ActivityIcon className="size-4" /> Governança · rastreabilidade</div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Logs de auditoria</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Acompanhe as ações realizadas na plataforma com rastreabilidade por usuário, entidade e resultado.</p>
        </div>
        <div className="relative flex flex-wrap gap-2"><Button variant="outline" onClick={() => void mutate()}><RefreshCwIcon data-icon="inline-start" />Atualizar</Button><Button onClick={() => void downloadCsv(logs)} disabled={!logs.length}><DownloadIcon data-icon="inline-start" />Exportar CSV</Button></div>
      </div>
      <div className="relative flex flex-wrap gap-x-8 gap-y-3 border-t border-border/70 px-5 py-4 text-xs text-muted-foreground sm:px-7"><span>ÚLTIMA CAPTURA <strong className="ml-1 font-mono text-foreground">{latest ? new Date(latest).toLocaleString("pt-BR") : "—"}</strong></span><span>FONTE <strong className="ml-1 font-mono text-foreground">Banco de dados</strong></span><span className="flex items-center gap-1 text-primary"><span className="size-1.5 rounded-full bg-primary" /> Dados atualizados</span></div>
    </section>

    <section aria-label="Indicadores da auditoria" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metricCards.map(([label, value, Icon]) => <Card key={String(label)} className="gap-3 rounded-xl border-border/70 py-4 shadow-sm"><CardContent className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</p></div><div className="rounded-lg border border-primary/10 bg-primary/[0.07] p-2 text-primary"><Icon className="size-5" /></div></CardContent></Card>)}
    </section>

    <Card className="overflow-hidden rounded-xl border-border/70 py-0 shadow-sm">
      <CardHeader className="gap-5 border-b border-border/70 bg-muted/15 px-4 py-5 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><span className="size-2 rounded-full bg-primary" />Registros de auditoria</CardTitle><p className="mt-1 text-sm text-muted-foreground">{logs.length} registros no recorte atual · até 100 eventos recentes</p></div><Button variant="ghost" size="sm" onClick={() => { setQuery(""); setAction("todos"); setEntity("todos"); setResult("todos") }} disabled={!query && action === "todos" && entity === "todos" && result === "todos"}><FilterIcon data-icon="inline-start" />Limpar filtros</Button></div><div className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-3 text-sm"><p className="font-medium">Como consultar</p><p className="mt-1 text-muted-foreground">Comece pela busca livre ou escolha um filtro. A lista abaixo se atualiza automaticamente; exporte somente o recorte exibido.</p></div><div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,0.55fr))]"><div className="relative"><SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" aria-label="Buscar nos logs" placeholder="Usuário, ação ou identificador" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select aria-label="Filtrar ação" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={action} onChange={(event) => setAction(event.target.value)}><option value="todos">Todas as ações</option>{actions.map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="Filtrar entidade" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={entity} onChange={(event) => setEntity(event.target.value)}><option value="todos">Todas as entidades</option>{entities.map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="Filtrar resultado" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={result} onChange={(event) => setResult(event.target.value)}><option value="todos">Todos os resultados</option><option value="sucesso">Sucesso</option><option value="erro">Erro</option></select></div></CardHeader>
      <CardContent className="p-0"><div className="hidden grid-cols-[1.4fr_1.1fr_1fr_0.8fr_1.2fr] gap-4 border-b bg-muted/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid"><span>Evento / entidade</span><span>Usuário</span><span>Identificador</span><span>Resultado</span><span className="text-right">Data e hora</span></div><div className="divide-y">{logs.length ? logs.map((log) => <div className="grid gap-3 px-5 py-4 transition-colors hover:bg-primary/[0.03] md:grid-cols-[1.4fr_1.1fr_1fr_0.8fr_1.2fr] md:items-center md:gap-4" key={log.id}><div><p className="font-medium">{log.acao}</p><p className="mt-1 text-xs text-muted-foreground">{log.entidade}{log.entidadeId ? ` · ${log.entidadeId}` : ""}</p><p className="mt-1 text-xs text-muted-foreground/80">{log.detalhes ? "Informações adicionais disponíveis" : "Sem informações adicionais"}</p></div><div className="flex items-center gap-2 text-sm"><span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{(log.userName ?? log.userId ?? "?").charAt(0).toUpperCase()}</span><span className="truncate">{log.userName ?? log.userId ?? "Usuário não identificado"}</span></div><span className="font-mono text-xs text-muted-foreground">{log.entidadeId || "—"}</span><Badge variant={log.resultado === "erro" ? "destructive" : "secondary"} className="w-fit">{log.resultado ?? "sucesso"}</Badge><div className="flex items-center justify-between gap-2 md:justify-end"><time className="text-sm text-muted-foreground md:text-right" dateTime={log.criadoEm}>{new Date(log.criadoEm).toLocaleString("pt-BR")}</time><Button variant="ghost" size="sm" className="shrink-0" aria-label={`Ver detalhes do evento ${log.acao}`} onClick={() => setSelectedLog(log)}><EyeIcon data-icon="inline-start" />Detalhes</Button></div></div>) : <div className="p-12 text-center text-muted-foreground">Nenhum evento encontrado para os filtros informados.</div>}</div></CardContent>
    </Card>

    <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => { if (!open) setSelectedLog(null) }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do evento</DialogTitle>
          <DialogDescription>Registro completo da ação selecionada.</DialogDescription>
        </DialogHeader>
        {selectedLog && <div className="grid gap-4 text-sm">
          <div className="grid gap-1 sm:grid-cols-2"><div><span className="text-muted-foreground">Ação</span><p className="font-semibold">{selectedLog.acao}</p></div><div><span className="text-muted-foreground">Resultado</span><p className="font-semibold">{selectedLog.resultado ?? "sucesso"}</p></div></div>
          <div className="grid gap-1 sm:grid-cols-2"><div><span className="text-muted-foreground">Entidade</span><p className="font-mono">{selectedLog.entidade}</p></div><div><span className="text-muted-foreground">Identificador</span><p className="break-all font-mono">{selectedLog.entidadeId || "—"}</p></div></div>
          <div><span className="text-muted-foreground">Usuário</span><p>{selectedLog.userName ?? selectedLog.userId ?? "Usuário não identificado"}</p></div>
          <div><span className="text-muted-foreground">Data e hora</span><p>{new Date(selectedLog.criadoEm).toLocaleString("pt-BR")}</p></div>
          <div><span className="text-muted-foreground">Detalhes técnicos</span><pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-words">{selectedLog.detalhes || "Nenhum detalhe adicional registrado."}</pre></div>
        </div>}
      </DialogContent>
    </Dialog>
  </main>
}
