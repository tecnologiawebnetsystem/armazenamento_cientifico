import Link from "next/link"
import { ArrowRightIcon, ClipboardCheckIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { AccessRequest, Project, User } from "@/lib/types"

interface Props {
  requests: AccessRequest[]
  users: User[]
  projects: Project[]
}

export function PendingRequestsPanel({ requests, users, projects }: Props) {
  const pending = requests.filter((r) => r.status === "pendente")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitações de acesso</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/administracao/solicitacoes" />}
            nativeButton={false}
          >
            Gerenciar
            <ArrowRightIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ClipboardCheckIcon className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {pending.slice(0, 4).map((req) => {
              const user = users.find((u) => u.id === req.usuarioId)
              const project = projects.find((p) => p.id === req.projetoId)
              return (
                <div key={req.id} className="flex items-center justify-between gap-4 rounded-md px-2 py-2.5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-foreground">{user?.nome}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {project?.nome} · chamado {req.numeroChamadoServiceNow}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
