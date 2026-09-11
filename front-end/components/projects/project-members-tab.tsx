"use client"

import { UsersIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useProjectMembers } from "@/hooks/use-project-members"
import { roleLabel } from "@/hooks/use-permissions"

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase()
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
  const { members, isLoading, error, refresh } = useProjectMembers(projectId)

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrobras-green text-primary-foreground">
              <UsersIcon className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl tracking-tight">Membros e permissões</CardTitle>
              <CardDescription>Consulte os usuários vinculados ao projeto e o papel atribuído a cada um.</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit">{members.length} {members.length === 1 ? "membro" : "membros"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Não foi possível carregar os membros</EmptyTitle>
              <EmptyDescription>Verifique a conexão com a API e tente novamente.</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => refresh()}>Tentar novamente</Button>
          </Empty>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-lg" />)}
          </div>
        ) : members.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
              <EmptyTitle>Nenhum membro vinculado</EmptyTitle>
              <EmptyDescription>Os usuários vinculados ao projeto aparecerão nesta lista.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/80 bg-background">
            <div className="hidden grid-cols-[minmax(0,1fr)_180px] items-center gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <span>Colaborador</span><span>Papel no projeto</span>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between gap-3 px-2 py-2.5 sm:px-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-9">
                      {member.user.avatarUrl ? <AvatarImage src={member.user.avatarUrl} alt={member.user.nome} /> : null}
                      <AvatarFallback>{initials(member.user.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">{member.user.nome}</span>
                      <span className="truncate text-xs text-muted-foreground">{member.user.email}</span>
                    </div>
                  </div>
                  <Badge className="shrink-0 border-petrobras-yellow/50 bg-petrobras-yellow/15 text-foreground" variant="outline">
                    {roleLabel(displayedRole(member.papel))}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

