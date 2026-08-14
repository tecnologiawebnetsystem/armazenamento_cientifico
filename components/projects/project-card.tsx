import Link from "next/link"
import { FolderIcon, UsersIcon, DatabaseIcon } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectStatusBadge } from "@/components/projects/project-status-badge"
import type { Project } from "@/lib/types"

function formatStorage(mb?: number) {
  if (!mb) return "0 MB"
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

export function ProjectCard({ project }: { project: Project }) {
  const membros = project.participantesIds?.length ?? 0

  return (
    <Link href={`/projetos/${project.id}`} className="group block">
      <Card className="transition-colors group-hover:border-primary/40">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
              <FolderIcon className="size-4 text-primary" />
            </div>
          <ProjectStatusBadge status={project.status} />
          </div>
          <CardTitle className="text-balance leading-snug">{project.nome}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{project.areaResponsavel}</span>
          <span className="font-mono text-xs text-muted-foreground">{project.id}</span>
        </CardContent>
        <CardFooter className="justify-between border-t pt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <UsersIcon className="size-3.5" />
            {membros} {membros === 1 ? "membro" : "membros"}
          </span>
          <span className="flex items-center gap-1.5">
            <DatabaseIcon className="size-3.5" />
            {formatStorage(project.armazenamentoUsadoMb)}
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}
