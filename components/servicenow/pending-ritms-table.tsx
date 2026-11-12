"use client"

import { useMemo, useState } from "react"
import { ActivityIcon, CalendarDaysIcon, EyeIcon, InboxIcon, SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ServiceNowRitm } from "@/lib/servicenow"

type PendingRitmsTableProps = {
  requests: ServiceNowRitm[]
  onOpenRitm: (ritmNumber: string) => void
}

function formatRequestDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value))
}

export function PendingRitmsTable({ requests, onOpenRitm }: PendingRitmsTableProps) {
  const [filter, setFilter] = useState("")
  const pendingRequests = useMemo(() => requests
    .filter((request) => request.status === "Aberto" || request.status === "Em processamento")
    .toSorted((left, right) => new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime()), [requests])
  const filteredRequests = useMemo(() => {
    const normalizedFilter = filter.trim().toLocaleLowerCase("pt-BR")
    if (!normalizedFilter) return pendingRequests
    return pendingRequests.filter((request) => [request.ritmNumber, request.requestNumber, request.requestedBy, request.networkArea.name]
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedFilter)))
  }, [filter, pendingRequests])
  const inProgressCount = pendingRequests.filter((request) => request.status === "Em processamento").length
  const openCount = pendingRequests.length - inProgressCount

  return (
    <Card className="overflow-hidden rounded-2xl border-petrobras-green/15 py-0 shadow-[var(--sigac-shadow-surface)]">
      <CardHeader className="border-b border-petrobras-green/10 bg-petrobras-green/5 gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm">
            <InboxIcon aria-hidden="true" className="size-4 text-primary" />
            Fila de RITMs pendentes
          </CardTitle>
          <CardDescription>Abra uma solicitação para conferir todos os dados e continuar o atendimento.</CardDescription>
        </div>
        <Badge variant="outline" className="w-fit border-petrobras-yellow/50 bg-petrobras-yellow/15 text-foreground">Demonstração</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-2" aria-label="Resumo da fila">
            <Badge variant="secondary" className="gap-1.5"><ActivityIcon aria-hidden="true" className="size-3.5" />{inProgressCount} em processamento</Badge>
            <Badge variant="outline">{openCount} aberto{openCount === 1 ? "" : "s"}</Badge>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-80">
            <label htmlFor="pending-ritm-filter" className="text-xs font-medium">Filtrar solicitações</label>
            <div className="relative">
              <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="pending-ritm-filter" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="RITM, solicitante ou área" className="h-9 rounded-lg border-petrobras-green/20 bg-background pl-9 text-sm shadow-sm focus-visible:border-petrobras-green focus-visible:ring-petrobras-green/20" />
            </div>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <Empty className="min-h-48 rounded-xl border border-dashed border-border/70">
            <EmptyHeader>
              <EmptyMedia variant="icon"><InboxIcon aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>Nenhuma solicitação encontrada</EmptyTitle>
              <EmptyDescription>{filter ? "Tente outro termo ou limpe o filtro para ver a fila completa." : "Não há RITMs pendentes para exibir."}</EmptyDescription>
            </EmptyHeader>
            {filter ? <Button variant="outline" size="sm" onClick={() => setFilter("")}>Limpar filtro</Button> : null}
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-petrobras-green/10">
            <Table className="[&_th]:h-8 [&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_td]:p-1.5">
              <TableCaption className="sr-only">RITMs pendentes disponíveis para consulta demonstrativa.</TableCaption>
              <TableHeader>
                <TableRow className="bg-petrobras-green/5 hover:bg-petrobras-green/5">
                  <TableHead>RITM / solicitação</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Área de rede</TableHead>
                  <TableHead>Aberto em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  return (
                    <TableRow key={request.ritmNumber} className="transition-colors hover:bg-petrobras-yellow/10">
                      <TableCell className="min-w-36">
                        <p className="font-mono text-sm font-semibold">{request.ritmNumber}</p>
                        <p className="text-xs text-muted-foreground">{request.requestNumber}</p>
                      </TableCell>
                      <TableCell className="min-w-36 text-sm">{request.requestedBy}</TableCell>
                      <TableCell className="min-w-40 text-sm">{request.networkArea.name}</TableCell>
                      <TableCell className="min-w-28">
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDaysIcon aria-hidden="true" className="size-3.5" /><time dateTime={request.requestedAt}>{formatRequestDate(request.requestedAt)}</time></span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={request.status === "Em processamento" ? "secondary" : "outline"}>{request.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => onOpenRitm(request.ritmNumber)} aria-label={`Abrir detalhes do ${request.ritmNumber}`}>
                          <EyeIcon data-icon="inline-start" />Abrir detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs leading-5 text-muted-foreground">Exemplos fictícios para apresentação. A consulta e as ações desta fila ainda não buscam ou alteram dados reais no SIGAC.</p>
      </CardContent>
    </Card>
  )
}
