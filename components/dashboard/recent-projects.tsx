import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProjectStatusBadge } from "@/components/projects/project-status-badge"
import type { Project } from "@/lib/types"

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
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projetos/${project.id}`}
            className="flex items-center justify-between gap-4 rounded-md px-2 py-3 transition-colors hover:bg-muted/60"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground">{project.nome}</span>
              <span className="truncate text-xs text-muted-foreground">{project.areaResponsavel}</span>
            </div>
            <ProjectStatusBadge status={project.status} />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
