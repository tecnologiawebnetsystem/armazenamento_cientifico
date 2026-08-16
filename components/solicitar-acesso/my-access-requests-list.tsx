"use client"

import { CircleCheckIcon, CircleXIcon, ClockIcon, InboxIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useAccessRequests } from "@/hooks/use-access-requests"
import { useSession } from "@/hooks/use-session"
import { roleLabel } from "@/hooks/use-permissions"
import type { AccessRequestStatus } from "@/lib/types"

function StatusBadge({ status }: { status: AccessRequestStatus }) {
  switch (status) {
    case "aprovado":
      return (
        <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
          <CircleCheckIcon data-icon="inline-start" />
          Aprovado
        </Badge>
      )
    case "negado":
      return (
        <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
          <CircleXIcon data-icon="inline-start" />
          Negado
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
          <ClockIcon data-icon="inline-start" />
          Pendente
        </Badge>
      )
  }
}

export function MyAccessRequestsList() {
  const { requests: allRequests, isLoading } = useAccessRequests()
  const { user } = useSession()
  const requests = user ? allRequests.filter((r) => r.usuarioId === user.id) : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Minhas solicitações</CardTitle>
        <CardDescription>Histórico de solicitações de acesso enviadas por você.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhuma solicitação enviada</EmptyTitle>
              <EmptyDescription>Suas solicitações de acesso aparecerão aqui.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{r.numeroChamadoServiceNow}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  <span className="font-medium">{r.projetoId}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {r.tipo === "novo-acesso" ? "Novo acesso" : "Alteração de permissão"} como {roleLabel(r.papelSolicitado)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{r.justificativa}</p>
                <span className="text-xs text-muted-foreground">
                  Enviado em {new Date(r.criadoEm).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
