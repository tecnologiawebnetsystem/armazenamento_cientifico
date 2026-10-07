"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import useSWR from "swr"
import { ActivityIcon, DownloadIcon, EyeIcon, FilterIcon, RefreshCwIcon, SearchIcon, ShieldCheckIcon, UserRoundIcon, XIcon, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { PageHeader, PageLayout } from "@/components/shared/page-layout"
import { getActivityLogs, recordAuditEvent } from "@/lib/api-client"
import type { ActivityLog } from "@/lib/types"

type LogWithUser = ActivityLog & { userName?: string | null; userEmail?: string | null }

const actionLabels: Record<string, string> = {
  login: "Entrada na plataforma",
  logout: "Saída da plataforma",
  "consultar-mapa-acessos": "Consulta ao mapa de acessos",
  "exportar-relatorio": "Exportação de relatório",
  "exportar-logs": "Exportação de logs",
  "criar-projeto": "Criação de projeto",
  "editar-projeto": "Edição de projeto",
  "excluir-projeto": "Exclusão de projeto",
  "adicionar-membro": "Adição de membro",
  "atualizar-membro": "Atualização de membro",
  "remover-membro": "Remoção de membro",
  "criar-solicitacao-acesso": "Solicitação de acesso",
  "aprovar-solicitacao": "Aprovação de solicitação",
  "negar-solicitacao": "Negação de solicitação",
  "atualizar-papel-usuario": "Atualização de papel de usuário",
  "atualizar-matriz-permissoes": "Atualização da matriz de permissões",
  "atualizar-parametros": "Atualização de parâmetros",
}

const entityLabels: Record<string, string> = {
  mapa_acessos: "Mapa de acessos",
  relatorio: "Relatório",
  logs_auditoria: "Logs de auditoria",
  projeto: "Projeto",
  projetos: "Projetos",
  usuario: "Usuário",
  solicitacao_acesso: "Solicitação de acesso",
}

function displayAction(action: string) {
  return actionLabels[action] ?? action.replaceAll("-", " ").replace(/\\b\\w/g, (letter) => letter.toUpperCase())
}

function displayEntity(entity: string) {
  return entityLabels[entity] ?? entity.replaceAll("_", " ").replace(/\\b\\w/g, (letter) => letter.toUpperCase())
}

function displayEntityId(log: LogWithUser) {
  try {
    const details = JSON.parse(log.detalhes || "{}") as { projeto?: string; projeto_nome?: string; codigo?: string; nome?: string }
    if (log.acao === "consultar-mapa-acessos" || log.acao === "exportar-relatorio") {
      return details.projeto_nome || details.projeto || details.nome || details.codigo || log.entidadeId || "—"
    }
  } catch {
    // Mantém o identificador técnico quando o detalhe não estiver em JSON.
  }
  return log.entidadeId || "—"
}

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
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [action, setAction] = useState("todos")
  const [entity, setEntity] = useState("todos")
  const [result, setResult] = useState("todos")
  const [userId, setUserId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query), 350)
    return () => window.clearTimeout(timeoutId)
  }, [query])

  const { data, error, isLoading, mutate } = useSWR(
    ["/api/activity-logs", page, debouncedQuery, action, entity, result, userId, projectId, dateFrom, dateTo],
    () => getActivityLogs({ page, limit: 25, q: debouncedQuery, action: action === "todos" ? undefined : action, entity: entity === "todos" ? undefined : entity, result: result === "todos" ? undefined : result, user_id: userId, project_id: projectId, date_from: dateFrom, date_to: dateTo }),
    { keepPreviousData: true },
  )
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

  return <PageLayout>
    <PageHeader
      eyebrow="Governança de acesso · rastreabilidade"
      title="Logs de auditoria"
      description="Acompanhe as ações realizadas na plataforma com uma leitura simples por usuário, entidade e resultado."
      actions={<><Button variant="outline" onClick={() => void mutate()}><RefreshCwIcon data-icon="inline-start" />Atualizar</Button><Button onClick={() => void downloadCsv(logs)} disabled={!logs.length}><DownloadIcon data-icon="inline-start" />Exportar CSV</Button></>}
    />
    <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border border-border/70 bg-card/70 px-4 py-3 text-xs text-muted-foreground shadow-sm sm:px-5">
      <span>ÚLTIMA CAPTURA <strong className="ml-1 font-mono text-foreground">{latest ? new Date(latest).toLocaleString("pt-BR") : "—"}</strong></span>
      <span>FONTE <strong className="ml-1 font-mono text-foreground">Banco de dados</strong></span>
      <span className="flex items-center gap-1 text-primary"><span className="size-1.5 rounded-full bg-primary" /> Dados atualizados</span>
    </div>

    <section aria-label="Indicadores da auditoria" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metricCards.map(([label, value, Icon]) => <Card key={String(label)} className="gap-3 rounded-xl border-border/70 py-4 shadow-sm"><CardContent className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</p></div><div className="rounded-lg border border-primary/10 bg-primary/[0.07] p-2 text-primary"><Icon className="size-5" /></div></CardContent></Card>)}
    </section>

    <Card className="overflow-hidden rounded-xl border-border/70 py-0 shadow-sm">
      <CardHeader className="gap-5 border-b border-border/70 bg-muted/15 px-4 py-5 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><span className="size-2 rounded-full bg-primary" />Registros de auditoria</CardTitle><p className="mt-1 text-sm text-muted-foreground">{logs.length} registros no recorte atual · até 100 eventos recentes</p></div><Button variant="ghost" size="sm" onClick={() => { setQuery(""); setAction("todos"); setEntity("todos"); setResult("todos"); setUserId(""); setProjectId(""); setDateFrom(""); setDateTo(""); setPage(1) }} disabled={!query && action === "todos" && entity === "todos" && result === "todos"}><FilterIcon data-icon="inline-start" />Limpar filtros</Button></div><div className="grid gap-2 lg:grid-cols-[minmax(230px,1.4fr)_minmax(145px,0.75fr)_minmax(145px,0.75fr)_minmax(320px,1.5fr)]"><div className="relative"><SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-9 pl-9 text-sm" aria-label="Buscar nos logs" placeholder="Usuário, ação ou identificador" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></div><Input className="h-9 text-sm" aria-label="Filtrar usuário" placeholder="ID do usuário" value={userId} onChange={(event) => { setUserId(event.target.value); setPage(1) }} /><Input className="h-9 text-sm" aria-label="Filtrar projeto" placeholder="ID do projeto" value={projectId} onChange={(event) => { setProjectId(event.target.value); setPage(1) }} /><div className="flex min-w-0 items-end gap-2"><div className="min-w-0 flex-1"><label htmlFor="audit-date-from" className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Período · início</label><Input id="audit-date-from" className="h-9 min-w-0 text-sm" aria-label="Data inicial" type="datetime-local" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1) }} /></div><span className="mb-2 text-xs text-muted-foreground">até</span><div className="min-w-0 flex-1"><label htmlFor="audit-date-to" className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">fim</label><Input id="audit-date-to" className="h-9 min-w-0 text-sm" aria-label="Data final" type="datetime-local" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1) }} /></div></div></div><select aria-label="Filtrar ação" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={action} onChange={(event) => setAction(event.target.value)}><option value="todos">Todas as ações</option>{actions.map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="Filtrar entidade" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={entity} onChange={(event) => setEntity(event.target.value)}><option value="todos">Todas as entidades</option>{entities.map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="Filtrar resultado" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={result} onChange={(event) => setResult(event.target.value)}><option value="todos">Todos os resultados</option><option value="sucesso">Sucesso</option><option value="erro">Erro</option></select></CardHeader>
      <CardContent className="p-0"><div className="hidden grid-cols-[1.4fr_1.1fr_1fr_0.8fr_1.2fr] gap-4 border-b bg-muted/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid"><span>Evento / entidade</span><span>Usuário</span><span>Identificador</span><span>Resultado</span><span className="text-right">Data e hora</span></div><div className="divide-y">{logs.length ? logs.map((log) => <div className="grid gap-3 px-5 py-4 transition-colors hover:bg-primary/[0.03] md:grid-cols-[1.4fr_1.1fr_1fr_0.8fr_1.2fr] md:items-center md:gap-4" key={log.id}><div><p className="font-medium">{displayAction(log.acao)}</p><p className="mt-1 text-xs text-muted-foreground">{displayEntity(log.entidade)}{log.entidadeId ? ` · ${displayEntityId(log)}` : ""}</p><p className="mt-1 text-xs text-muted-foreground/80">{log.detalhes ? "Informações adicionais disponíveis" : "Sem informações adicionais"}</p></div><div className="flex items-center gap-2 text-sm"><span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{(log.userName ?? log.userId ?? "?").charAt(0).toUpperCase()}</span><span className="truncate">{log.userName ?? log.userId ?? "Usuário não identificado"}</span></div><span className="text-xs text-muted-foreground">{displayEntityId(log)}</span><Badge variant={log.resultado === "erro" ? "destructive" : "secondary"} className="w-fit">{log.resultado ?? "sucesso"}</Badge><div className="flex items-center justify-between gap-2 md:justify-end"><time className="text-sm text-muted-foreground md:text-right" dateTime={log.criadoEm}>{new Date(log.criadoEm).toLocaleString("pt-BR")}</time><Button variant="ghost" size="sm" className="shrink-0" aria-label={`Ver detalhes do evento ${displayAction(log.acao)}`} onClick={() => setSelectedLog(log)}><EyeIcon data-icon="inline-start" />Detalhes</Button></div></div>) : <div className="p-12 text-center text-muted-foreground">Nenhum evento encontrado para os filtros informados.</div>}</div></CardContent>
    </Card>

    <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => { if (!open) setSelectedLog(null) }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do evento</DialogTitle>
          <DialogDescription>Registro completo da ação selecionada.</DialogDescription>
        </DialogHeader>
        {selectedLog && <div className="grid gap-4 text-sm">
          <div className="grid gap-1 sm:grid-cols-2"><div><span className="text-muted-foreground">Ação</span><p className="font-semibold">{displayAction(selectedLog.acao)}</p></div><div><span className="text-muted-foreground">Resultado</span><p className="font-semibold">{selectedLog.resultado ?? "sucesso"}</p></div></div>
          <div className="grid gap-1 sm:grid-cols-2"><div><span className="text-muted-foreground">Entidade</span><p className="font-mono">{displayEntity(selectedLog.entidade)}</p></div><div><span className="text-muted-foreground">Identificador</span><p className="break-all">{displayEntityId(selectedLog)}</p></div></div>
          <div><span className="text-muted-foreground">Usuário</span><p>{selectedLog.userName ?? selectedLog.userId ?? "Usuário não identificado"}</p></div>
          <div><span className="text-muted-foreground">Data e hora</span><p>{new Date(selectedLog.criadoEm).toLocaleString("pt-BR")}</p></div>
          <div><span className="text-muted-foreground">Rota / método</span><p className="break-all font-mono">{selectedLog.metodoHttp ?? "—"} {selectedLog.rota ?? ""}</p></div>
        </div>}
      </DialogContent>
    </Dialog>
  </PageLayout>
}
