"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertCircleIcon, CheckCircle2Icon, ChevronLeftIcon, ChevronRightIcon, HistoryIcon, SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useActivityLogs, type ActivityLogFilters } from "@/hooks/use-activity-logs"
import type { ActivityLog } from "@/lib/types"
import { ExportButton, ExportFieldsDialog, type ExportField } from "@/components/export-fields-dialog"

type ActivityLogWithUser = ActivityLog & { user: { nome: string } | null }
function field(params: URLSearchParams, key: string) { return params.get(key) ?? "" }

export function ActivityLogTable() {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams()
  const [selected, setSelected] = useState<ActivityLogWithUser | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const exportFields: ExportField[] = [
    { key: "id", label: "ID" }, { key: "usuario", label: "Usuário" }, { key: "acao", label: "Ação" },
    { key: "entidade", label: "Entidade" }, { key: "entidadeId", label: "ID da entidade" },
    { key: "detalhes", label: "Detalhes" }, { key: "criadoEm", label: "Data" }, { key: "correlationId", label: "Correlation ID" },
  ]
  const filters: ActivityLogFilters = useMemo(() => ({ q: field(searchParams, "q"), usuario: field(searchParams, "usuario"), projeto: field(searchParams, "projeto"), acao: field(searchParams, "acao"), resultado: field(searchParams, "resultado"), de: field(searchParams, "de"), ate: field(searchParams, "ate"), page: Number(searchParams.get("page") ?? 1), limit: 10 }), [searchParams])
  const { logs, pagination, isLoading, isValidating } = useActivityLogs(filters)
  const update = (key: string, value: string) => { const next = new URLSearchParams(searchParams.toString()); value ? next.set(key, value) : next.delete(key); if (key !== "page") next.set("page", "1"); router.push(`${pathname}?${next}`) }
  const exportLogs = (fields: string[], formats: ("csv" | "txt" | "pdf")[]) => { formats.forEach((format) => { const next = new URLSearchParams(searchParams.toString()); next.set("format", format); next.set("fields", fields.join(",")); window.open(`/api/activity-logs?${next.toString()}`, "_blank", "noopener,noreferrer") }) }
  const options = useMemo(() => ({ actions: [...new Set(logs.map((log) => log.acao))] }), [logs])
  return <Card>
    <CardHeader className="gap-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>Trilha de auditoria</CardTitle><CardDescription>{pagination.total} eventos no escopo autorizado. {isValidating ? "Atualizando…" : ""}</CardDescription></div><div className="flex gap-2"><ExportButton onClick={() => setExportOpen(true)} /></div></div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"><div className="relative lg:col-span-2"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar usuário, projeto, ação ou correlationId" value={filters.q} onChange={(e) => update("q", e.target.value)} /></div><select aria-label="Filtrar ação" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filters.acao} onChange={(e) => update("acao", e.target.value)}><option value="">Todas as ações</option>{options.actions.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filtrar resultado" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filters.resultado} onChange={(e) => update("resultado", e.target.value)}><option value="">Todos os resultados</option><option value="sucesso">Sucesso</option><option value="erro">Erro</option></select><Input aria-label="Data inicial" type="date" value={filters.de} onChange={(e) => update("de", e.target.value)} /><Input aria-label="Data final" type="date" value={filters.ate} onChange={(e) => update("ate", e.target.value)} /></div></CardHeader>
    <CardContent>{isLoading ? <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div> : !logs.length ? <Empty><EmptyHeader><EmptyMedia variant="icon"><HistoryIcon /></EmptyMedia><EmptyTitle>Nenhum evento encontrado</EmptyTitle><EmptyDescription>Ajuste os filtros para consultar outro período ou ação.</EmptyDescription></EmptyHeader></Empty> : <><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Usuário</TableHead><TableHead>Ação</TableHead><TableHead>Projeto</TableHead><TableHead>Resultado</TableHead><TableHead>correlationId</TableHead><TableHead className="text-right">Detalhes</TableHead></TableRow></TableHeader><TableBody>{logs.map((log) => <TableRow key={log.id}><TableCell className="whitespace-nowrap text-xs">{new Date(log.criadoEm).toLocaleString("pt-BR")}</TableCell><TableCell>{log.user?.nome ?? "Usuário removido"}</TableCell><TableCell><Badge variant="outline">{log.acao}</Badge></TableCell><TableCell className="font-mono text-xs">{log.projetoId ?? "—"}</TableCell><TableCell>{log.resultado === "erro" ? <Badge variant="destructive"><AlertCircleIcon data-icon="inline-start" />Erro</Badge> : <Badge variant="secondary"><CheckCircle2Icon data-icon="inline-start" />Sucesso</Badge>}</TableCell><TableCell className="max-w-36 truncate font-mono text-xs">{log.correlationId ?? "—"}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setSelected(log)}>Ver evento</Button></TableCell></TableRow>)}</TableBody></Table><div className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground"><span>Página {pagination.page} de {Math.max(pagination.totalPages, 1)}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => update("page", String(pagination.page - 1))}><ChevronLeftIcon data-icon="inline-start" />Anterior</Button><Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => update("page", String(pagination.page + 1))}>Próxima<ChevronRightIcon data-icon="inline-end" /></Button></div></div></>}</CardContent>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}><DialogContent><DialogHeader><DialogTitle>Detalhes do evento</DialogTitle><DialogDescription>Registro completo da operação de auditoria.</DialogDescription></DialogHeader>{selected ? <dl className="grid gap-3 text-sm"><div><dt className="font-medium">Data</dt><dd>{new Date(selected.criadoEm).toLocaleString("pt-BR")}</dd></div><div><dt className="font-medium">Usuário</dt><dd>{selected.user?.nome ?? "Usuário removido"}</dd></div><div><dt className="font-medium">correlationId</dt><dd className="break-all font-mono">{selected.correlationId ?? "Não informado"}</dd></div><div><dt className="font-medium">Detalhes</dt><dd className="text-muted-foreground">{selected.detalhes}</dd></div></dl> : null}</DialogContent></Dialog>
    <ExportFieldsDialog open={exportOpen} onOpenChange={setExportOpen} title="logs de auditoria" fields={exportFields} defaultFormats={["csv", "txt"]} onConfirm={exportLogs} />
  </Card>
}
