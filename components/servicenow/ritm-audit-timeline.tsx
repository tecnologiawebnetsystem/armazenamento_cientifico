import { ActivityIcon, ArrowDownToLineIcon, ArrowUpFromLineIcon, RefreshCwIcon, SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ServiceNowAuditEntry } from "@/lib/servicenow"

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function getEventIcon(event: ServiceNowAuditEntry) {
  if (event.status === "Falha") return RefreshCwIcon
  if (event.category === "Consulta") return SearchIcon
  if (event.category === "Concessão") return ArrowUpFromLineIcon
  if (event.category === "Revogação") return ArrowDownToLineIcon
  return ActivityIcon
}

export function RitmAuditTimeline({ events, title = "Linha do tempo do RITM", description = "Atividades registradas nesta sessão." }: { events: ServiceNowAuditEntry[]; title?: string; description?: string }) {
  return (
    <Card className="rounded-2xl border-petrobras-green/15 py-0 shadow-[var(--sigac-shadow-surface)]">
      <CardHeader className="border-b border-petrobras-green/10 bg-petrobras-green/5 gap-1 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm"><ActivityIcon aria-hidden="true" className="size-4 text-primary" />{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {events.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhuma atividade registrada para este filtro.</p> : (
          <ol className="flex flex-col">
            {events.map((event) => {
              const EventIcon = getEventIcon(event)
              return (
                <li key={event.id} className="flex gap-3 border-l border-border pl-4 pb-4 last:border-l-0 last:pb-0">
                  <span className={`-ml-[1.35rem] grid size-7 shrink-0 place-items-center rounded-full border bg-card ${event.status === "Falha" ? "border-destructive/30 text-destructive" : "border-primary/20 text-primary"}`}>
                    <EventIcon aria-hidden="true" className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{event.title}</p>
                      <Badge variant={event.status === "Falha" ? "destructive" : event.status === "Concluído" ? "secondary" : "outline"}>{event.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{event.description}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <time dateTime={event.timestamp}>{formatTimestamp(event.timestamp)}</time>
                      <span>{event.actor}</span>
                      {event.groupId ? <span className="font-mono">Grupo {event.groupId}</span> : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
