"use client"

import { useMemo, useState } from "react"
import { DownloadIcon, HistoryIcon, SearchIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useActivityLogs } from "@/hooks/use-activity-logs"

function initials(nome: string) { return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() }
function escapeCsv(value: string) { return `"${value.replaceAll('"', '""')}"` }

export function ActivityLogTable() {
  const { logs, isLoading } = useActivityLogs()
  const [query, setQuery] = useState("")
  const [action, setAction] = useState("")
  const filtered = useMemo(() => logs.filter((log) => {
    const text = `${log.detalhes} ${log.acao} ${log.entidade} ${log.user?.nome ?? ""}`.toLowerCase()
    return (!query || text.includes(query.toLowerCase())) && (!action || log.acao === action)
  }), [logs, query, action])
  const actions = [...new Set(logs.map((log) => log.acao))]
  const exportLogs = (format: "csv" | "txt") => {
    const rows = format === "csv"
      ? ["Data,Usuário,Ação,Entidade,Detalhes", ...filtered.map((l) => [l.criadoEm, l.user?.nome ?? "Usuário removido", l.acao, `${l.entidade}/${l.entidadeId}`, l.detalhes].map(escapeCsv).join(","))]
      : filtered.map((l) => `${new Date(l.criadoEm).toLocaleString("pt-BR")} | ${l.user?.nome ?? "Usuário removido"} | ${l.acao} | ${l.entidade}/${l.entidadeId} | ${l.detalhes}`)
    const blob = new Blob([rows.join("\n")], { type: format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.${format}`; link.click(); URL.revokeObjectURL(url)
  }
  return <Card>
    <CardHeader className="gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>Eventos registrados</CardTitle><CardDescription>{filtered.length} eventos encontrados na trilha de auditoria.</CardDescription></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => exportLogs("txt")} disabled={!filtered.length}><DownloadIcon data-icon="inline-start" />TXT</Button><Button variant="outline" size="sm" onClick={() => exportLogs("csv")} disabled={!filtered.length}><DownloadIcon data-icon="inline-start" />CSV</Button></div></div>
      <div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar usuário, ação ou detalhe" value={query} onChange={(e) => setQuery(e.target.value)} /></div><select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={action} onChange={(e) => setAction(e.target.value)}><option value="">Todas as ações</option>{actions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
    </CardHeader><CardContent>{isLoading ? <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div> : !filtered.length ? <Empty><EmptyHeader><EmptyMedia variant="icon"><HistoryIcon /></EmptyMedia><EmptyTitle>Nenhum evento encontrado</EmptyTitle><EmptyDescription>Ajuste os filtros ou aguarde novas operações.</EmptyDescription></EmptyHeader></Empty> : <Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Ação</TableHead><TableHead>Entidade</TableHead><TableHead>Detalhes</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{filtered.map((log) => <TableRow key={log.id}><TableCell><div className="flex items-center gap-2"><Avatar className="size-7"><AvatarFallback className="text-xs">{initials(log.user?.nome ?? "?")}</AvatarFallback></Avatar>{log.user?.nome ?? "Usuário removido"}</div></TableCell><TableCell><Badge variant="secondary">{log.acao}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{log.entidade}/{log.entidadeId}</TableCell><TableCell className="max-w-md text-sm text-muted-foreground">{log.detalhes}</TableCell><TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(log.criadoEm).toLocaleString("pt-BR")}</TableCell></TableRow>)}</TableBody></Table>}</CardContent>
  </Card>
}
