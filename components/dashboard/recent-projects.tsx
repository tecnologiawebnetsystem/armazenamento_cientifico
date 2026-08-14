import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Project } from "@/lib/types"

const statusVariant: Record<Project["status"], { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-success/10 text-success border-success/30" },
  concluido: { label: "Concluído", className: "bg-primary/10 text-primary border-primary/30" },
  suspenso: { label: "Suspenso", className: "bg-warning/10 text-warning border-warning/30" },
}

export function RecentProjects({ projects }: { projects: Project[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projetos recentes</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href="/projetos" />} nativeButton={false}>
            Ver todos
            <ArrowRightIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {projects.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum projeto encontrado.</p>}
        {projects.map((project) => {
          const status = statusVariant[project.status]
          return (
            <Link
              key={project.id}
              href={`/projetos/${project.id}`}
              className="flex items-center justify-between gap-4 rounded-md px-2 py-3 transition-colors hover:bg-muted/60"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">{project.nome}</span>
                <span className="truncate text-xs text-muted-foreground">{project.areaResponsavel}</span>
              </div>
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
