"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { CheckIcon, ClipboardListIcon, Loader2Icon, XIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useAccessRequests } from "@/hooks/use-access-requests"
import { useUsers } from "@/hooks/use-users"
import { useProjects } from "@/hooks/use-projects"
import { roleLabel } from "@/hooks/use-permissions"
import { updateAccessRequest, ApiError } from "@/lib/api-client"
import type { AccessRequest } from "@/lib/types"

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}

export function AccessRequestsQueue() {
  const { requests, isLoading, refresh } = useAccessRequests()
  const { users } = useUsers()
  const { projects } = useProjects()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const pending = useMemo(() => requests.filter((r) => r.status === "pendente"), [requests])
  const resolved = useMemo(() => requests.filter((r) => r.status !== "pendente"), [requests])

  async function handleDecision(request: AccessRequest, status: "aprovado" | "negado") {
    setProcessingId(request.id)
    try {
      await updateAccessRequest(request.id, status)
      toast.success(status === "aprovado" ? "Solicitação aprovada." : "Solicitação negada.")
      refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível processar a solicitação."
      toast.error(message)
    } finally {
      setProcessingId(null)
    }
  }

  function RequestCard({ request, showActions }: { request: AccessRequest; showActions: boolean }) {
    const solicitante = users.find((u) => u.id === request.usuarioId)
    const projeto = projects.find((p) => p.id === request.projetoId)
    const isProcessing = processingId === request.id

    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              {solicitante?.avatarUrl ? <AvatarImage src={solicitante.avatarUrl} alt={solicitante.nome} /> : null}
              <AvatarFallback className="text-xs">{initials(solicitante?.nome ?? "?")}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{solicitante?.nome ?? request.usuarioId}</span>
              <span className="text-xs text-muted-foreground">{solicitante?.area}</span>
            </div>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{request.numeroChamadoServiceNow}</span>
        </div>

        <p className="text-sm text-foreground">
          {request.tipo === "novo-acesso" ? "Solicita novo acesso" : "Solicita alteração de permissão"} ao projeto{" "}
          <span className="font-medium">{projeto?.nome ?? request.projetoId}</span> como{" "}
          <Badge variant="outline">{roleLabel(request.papelSolicitado)}</Badge>
        </p>
        <p className="text-sm text-muted-foreground">{request.justificativa}</p>
        <span className="text-xs text-muted-foreground">
          Enviado em {new Date(request.criadoEm).toLocaleDateString("pt-BR")}
        </span>

        {showActions ? (
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleDecision(request, "negado")}
            >
              {isProcessing ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <XIcon data-icon="inline-start" />}
              Negar
            </Button>
            <Button size="sm" disabled={isProcessing} onClick={() => handleDecision(request, "aprovado")}>
              {isProcessing ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <CheckIcon data-icon="inline-start" />}
              Aprovar
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Badge
              variant="outline"
              className={
                request.status === "aprovado"
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }
            >
              {request.status === "aprovado" ? "Aprovado" : "Negado"}
            </Badge>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitações</CardTitle>
        <CardDescription>{pending.length} solicitações pendentes de análise.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="pendentes">
            <TabsList>
              <TabsTrigger value="pendentes">Pendentes ({pending.length})</TabsTrigger>
              <TabsTrigger value="resolvidas">Resolvidas ({resolved.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pendentes" className="mt-4">
              {pending.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardListIcon />
                    </EmptyMedia>
                    <EmptyTitle>Nenhuma solicitação pendente</EmptyTitle>
                    <EmptyDescription>Todas as solicitações foram analisadas.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-3">
                  {pending.map((r) => (
                    <RequestCard key={r.id} request={r} showActions />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="resolvidas" className="mt-4">
              {resolved.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardListIcon />
                    </EmptyMedia>
                    <EmptyTitle>Nenhuma solicitação resolvida</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-3">
                  {resolved.map((r) => (
                    <RequestCard key={r.id} request={r} showActions={false} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
