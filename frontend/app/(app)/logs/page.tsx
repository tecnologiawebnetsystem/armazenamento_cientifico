"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { ClipboardListIcon, FilterIcon, RefreshCwIcon } from "lucide-react"
import { BackButton } from "@/components/navigation/back-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import { getActivityLogs } from "@/lib/api-client"
import type { ActivityLog } from "@/lib/types"

const fetcher = () => getActivityLogs({ page: 1, limit: 100 })

export default function LogsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/activity-logs?limit=100", fetcher)
  const [query, setQuery] = useState("")
  const [action, setAction] = useState("todos")

  const actions = useMemo(() => Array.from(new Set((data?.logs ?? []).map((log) => log.acao))), [data])
  const logs = useMemo(() => (data?.logs ?? []).filter((log) => {
    const text = `${log.acao} ${log.entidade} ${log.entidadeId ?? ""} ${log.user?.nome ?? ""}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (action === "todos" || log.acao === action)
  }), [data, query, action])

  if (isLoading) return <main className="flex flex-col gap-6"><h1 className="text-2xl font-semibold">Consulta de logs</h1><PetrobrasLoading label="Carregando trilha de auditoria..." /></main>
  if (error || !data) return <main className="flex flex-col gap-6"><BackButton /><p className="text-destructive">Não foi possível carregar os logs.</p></main>

  return <main className="flex flex-col gap-6">
    <BackButton />
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium tracking-[0.16em] text-primary uppercase">Governança e segurança</p>
        <h1 className="text-3xl font-semibold tracking-tight">Consulta de logs</h1>
        <p className="max-w-2xl text-muted-foreground">Consulte as ações registradas na trilha de auditoria do SIGAC.</p>
      </div>
      <Button variant="outline" onClick={() => void mutate()}><RefreshCwIcon data-icon="inline-start" />Atualizar</Button>
    </header>
    <Card>
      <CardHeader className="gap-4">
        <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardListIcon /></div><div><CardTitle>Atividades registradas</CardTitle><CardDescription>{logs.length} registros encontrados</CardDescription></div></div>
        <div className="flex flex-col gap-3 md:flex-row">
          <Input aria-label="Buscar nos logs" placeholder="Buscar por ação, entidade ou usuário" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select aria-label="Filtrar ação" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={action} onChange={(event) => setAction(event.target.value)}><option value="todos">Todas as ações</option>{actions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <Button variant="ghost" onClick={() => { setQuery(""); setAction("todos") }}><FilterIcon data-icon="inline-start" />Limpar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col divide-y rounded-xl border">
          {logs.length ? logs.map((log: ActivityLog & { user?: { nome?: string } | null }) => <div className="flex flex-wrap items-center justify-between gap-4 p-4" key={log.id}><div className="flex min-w-0 items-start gap-3"><div className="mt-1 size-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0"><p className="font-medium">{log.acao}</p><p className="text-sm text-muted-foreground">{log.entidade}{log.entidadeId ? ` · ${log.entidadeId}` : ""}</p><p className="text-xs text-muted-foreground">{log.user?.nome ?? "Usuário do sistema"}</p></div></div><Badge variant="secondary">{new Date(log.criadoEm).toLocaleString("pt-BR")}</Badge></div>) : <div className="p-10 text-center text-muted-foreground">Nenhum registro encontrado para os filtros informados.</div>}
        </div>
      </CardContent>
    </Card>
  </main>
}
