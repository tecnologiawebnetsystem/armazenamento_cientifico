"use client"

import useSWR from "swr"
import { ShieldCheckIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { getProjectAccessMap } from "@/lib/api-client"
import { ProjectAccessGroupsManager } from "@/components/projects/project-access-groups-manager"
import { roleLabel } from "@/hooks/use-permissions"

function initials(nome?: string | null, userId?: string | null) {
  const normalizedName = nome?.trim() || userId?.trim() || "Usuário"
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

export function ProjectMembersTab({
  projectId,
  canManage = false,
}: {
  projectId: string
  canManage?: boolean
}) {
  const { data, isLoading, error, mutate } = useSWR(
    ["project-access-map", projectId],
    () => getProjectAccessMap(projectId)
  )
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
              <CardTitle className="text-lg tracking-tight">
                Acessos da área
              </CardTitle>
              <CardDescription>
                Grupos recebidos da integração e pessoas com acesso.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {groups.length}{" "}
              {groups.length === 1 ? "grupo/role" : "grupos/roles"}
            </Badge>
            <Badge variant="secondary">
              {members.length} {members.length === 1 ? "pessoa" : "pessoas"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-5 py-6 sm:px-7">
        {error ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Não foi possível carregar os acessos</EmptyTitle>
              <EmptyDescription>
                O serviço não respondeu. Tente novamente.
              </EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => mutate()}>
              Tentar novamente
            </Button>
          </Empty>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : (
          <>
            <h3 className="text-base font-semibold">Grupos da integração</h3>
            {groups.length === 0 ? (
              <p className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Nenhum grupo recebido da integração.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {groups.map((group) => (
                  <div
                    key={`${group.fonte}-${group.nome}`}
                    className="rounded-xl border border-border/80 bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {group.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fonte: {group.fonte}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        <Badge variant="outline">
                          {group.principalType === "role" ? "Papel" : "Grupo"}
                        </Badge>
                        <Badge variant="secondary">{group.nivel}</Badge>
                      </div>
                    </div>
                    <div
                      className="mt-3 flex flex-col gap-1"
                      aria-label={`Identificadores de ${group.nome}`}
                    >
                      {group.identificadores.map((identifier) => (
                        <code
                          key={identifier}
                          className="rounded bg-muted px-2 py-1 text-xs break-all text-muted-foreground"
                        >
                          {identifier}
                        </code>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {canManage && <ProjectAccessGroupsManager projectId={projectId} />}
            <section
              aria-labelledby="project-members-title"
              className="flex flex-col gap-3"
            >
              <h3
                id="project-members-title"
                className="text-base font-semibold"
              >
                Pessoas com acesso
              </h3>
              <div className="overflow-hidden rounded-xl border border-border/80 bg-background">
                <div className="hidden grid-cols-[minmax(0,1fr)_180px] items-center gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:grid">
                  <span>Pessoa</span>
                  <span>Perfil</span>
                </div>
                <div className="flex flex-col divide-y divide-border">
                  {members.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-muted-foreground">
                      Nenhuma pessoa com acesso individual.
                    </p>
                  ) : (
                    members.map((member) => (
                      <div
                        key={member.userId}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_180px] sm:px-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-9">
                            {member.user.avatarUrl ? (
                              <AvatarImage
                                src={member.user.avatarUrl}
                                alt={member.user.nome}
                              />
                            ) : null}
                            <AvatarFallback>
                              {initials(
                                member.user.nome,
                                member.user.userId || member.userId
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium text-foreground">
                              {member.user.nome ||
                                member.user.userId ||
                                member.userId}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {member.user.email ||
                                `Identificador: ${member.user.userId || member.userId}`}
                            </span>
                          </div>
                        </div>
                        <Badge
                          className="shrink-0 border-petrobras-yellow/50 bg-petrobras-yellow/15 text-foreground"
                          variant="outline"
                        >
                          {roleLabel(displayedRole(member.papel))}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  )
}
