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
import { ProjectFolderAccessPanel } from "@/components/projects/project-folder-access-panel"
import { useCan } from "@/hooks/use-permissions"

export function ProjectMembersTab({
  projectId,
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
  const canViewFolderAccess = useCan("pesquisa.visualizar")

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
            {canViewFolderAccess && (
              <ProjectFolderAccessPanel projectId={projectId} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
