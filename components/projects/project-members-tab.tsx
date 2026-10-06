"use client"

import useSWR from "swr"
import { UsersIcon, ShieldCheckIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { getProjectAccessMap } from "@/lib/api-client"
import { roleLabel } from "@/hooks/use-permissions"

function initials(nome?: string | null) {
  const normalizedName = nome?.trim() || "Usuário"
  const result = normalizedName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase()

  return result || "U"
}

function displayedRole(value: unknown) {
  const normalized = String(value ?? "").toLowerCase()
  if (["gestor", "gerente", "manager"].includes(normalized)) return "gerente"
  if (["participante", "participant"].includes(normalized)) return "solicitante"
  if (["visualizador", "viewer"].includes(normalized)) return "visualizador"
  if (["solicitante", "requester"].includes(normalized)) return "solicitante"
  return normalized
}

export function ProjectMembersTab({ projectId }: { projectId: string; canManage?: boolean }) {
  const { data, isLoading, error, mutate } = useSWR(["project-access-map", projectId], () => getProjectAccessMap(projectId))
  const members = data?.members ?? []
  const groups = data?.groups ?? []

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrobras-green text-primary-foreground">
              <ShieldCheckIcon className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl tracking-tight">Mapa de acessos</CardTitle>
              <CardDescription>Grupos, membros e níveis de acesso autorizados para este projeto.</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{groups.length} {groups.length === 1 ? "grupo" : "grupos"}</Badge>
            <Badge variant="secondary">{members.length} {members.length === 1 ? "membro" : "membros"}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-5 py-6 sm:px-7">
        {error ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Não foi possível carregar o mapa de acessos</EmptyTitle>
              <EmptyDescription>A API de Identidade ou o serviço de projetos não respondeu. Tente novamente.</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => mutate()}>Tentar novamente</Button>
          </Empty>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-lg" />)}</div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><UsersIcon /></EmptyMedia><EmptyTitle>Nenhum grupo retornado</EmptyTitle><EmptyDescription>Não há grupos de identidade associados ao projeto.</EmptyDescription></EmptyHeader></Empty> : groups.map((group) => (
                <div key={`${group.fonte}-${group.nome}`} className="rounded-xl border border-border/80 bg-background p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-foreground">{group.nome}</p><p className="text-xs text-muted-foreground">Fonte: {group.fonte}</p></div><Badge variant="outline">{group.nivel}</Badge></div>
                  <p className="mt-3 text-xs text-muted-foreground">{group.identificadores.length} identificador(es) consolidado(s)</p>
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-xl border border-border/80 bg-background">
              <div className="hidden grid-cols-[minmax(0,1fr)_180px_160px] items-center gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid"><span>Colaborador</span><span>Papel</span><span>Origem</span></div>
              <div className="flex flex-col divide-y divide-border">
                {members.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum membro individual retornado.</p> : members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between gap-3 px-2 py-2.5 sm:px-4">
                    <div className="flex min-w-0 items-center gap-3"><Avatar className="size-9">{member.user.avatarUrl ? <AvatarImage src={member.user.avatarUrl} alt={member.user.nome} /> : null}<AvatarFallback>{initials(member.user.nome)}</AvatarFallback></Avatar><div className="flex min-w-0 flex-col"><span className="truncate text-sm font-medium text-foreground">{member.user.nome}</span><span className="truncate text-xs text-muted-foreground">{member.user.email}</span></div></div>
                    <Badge className="shrink-0 border-petrobras-yellow/50 bg-petrobras-yellow/15 text-foreground" variant="outline">{roleLabel(displayedRole(member.papel))}</Badge>
                    <span className="hidden text-xs text-muted-foreground sm:block">Mapa do projeto</span>
                  </div>
                ))}
              </div>
            </div>
            {data && <p className="text-xs text-muted-foreground">Fonte: {data.source} · Consultado em {new Date(data.consultedAt).toLocaleString("pt-BR")}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
