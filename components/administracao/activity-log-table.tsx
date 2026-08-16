"use client"

import { HistoryIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useActivityLogs } from "@/hooks/use-activity-logs"
import type { ActivityAction } from "@/lib/types"

const actionConfig: Record<ActivityAction, { label: string; className: string }> = {
  login: { label: "Login", className: "border-muted-foreground/30 bg-muted text-muted-foreground" },
  logout: { label: "Logout", className: "border-muted-foreground/30 bg-muted text-muted-foreground" },
  "criar-projeto": { label: "Criou projeto", className: "border-success/40 bg-success/10 text-success" },
  "editar-projeto": { label: "Editou projeto", className: "border-primary/40 bg-primary/10 text-primary" },
  "excluir-projeto": { label: "Excluiu projeto", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  "adicionar-membro": { label: "Adicionou membro", className: "border-success/40 bg-success/10 text-success" },
  "atualizar-membro": { label: "Atualizou membro", className: "border-primary/40 bg-primary/10 text-primary" },
  "remover-membro": { label: "Removeu membro", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  "criar-pasta": { label: "Criou pasta", className: "border-success/40 bg-success/10 text-success" },
  "enviar-arquivo": { label: "Enviou arquivo", className: "border-success/40 bg-success/10 text-success" },
  "renomear-item": { label: "Renomeou item", className: "border-primary/40 bg-primary/10 text-primary" },
  "mover-item": { label: "Moveu item", className: "border-primary/40 bg-primary/10 text-primary" },
  "excluir-item": { label: "Excluiu item", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  "compartilhar-item": { label: "Compartilhou item", className: "border-primary/40 bg-primary/10 text-primary" },
  "remover-compartilhamento": {
    label: "Removeu compartilhamento",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  "criar-solicitacao-acesso": {
    label: "Criou solicitação",
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  "aprovar-solicitacao": { label: "Aprovou solicitação", className: "border-success/40 bg-success/10 text-success" },
  "negar-solicitacao": { label: "Negou solicitação", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  "atualizar-papel-usuario": {
    label: "Atualizou papel de usuário",
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  "atualizar-matriz-permissoes": {
    label: "Atualizou matriz de permissões",
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  "atualizar-parametros": { label: "Atualizou parâmetros", className: "border-primary/40 bg-primary/10 text-primary" },
}

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}

export function ActivityLogTable() {
  const { logs, isLoading } = useActivityLogs()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos registrados</CardTitle>
        <CardDescription>{logs.length} eventos registrados na trilha de auditoria.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhum evento registrado</EmptyTitle>
              <EmptyDescription>As ações realizadas na plataforma aparecerão aqui.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const action = actionConfig[log.acao]
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          {log.user?.avatarUrl ? <AvatarImage src={log.user.avatarUrl} alt={log.user.nome} /> : null}
                          <AvatarFallback className="text-xs">{initials(log.user?.nome ?? "?")}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-foreground">{log.user?.nome ?? "Usuário removido"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={action.className}>
                        {action.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md text-sm text-muted-foreground whitespace-normal">
                      {log.detalhes}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(log.criadoEm).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
