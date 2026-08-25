"use client"

import Link from "next/link"
import {
  FolderIcon,
  UsersIcon,
  DatabaseIcon,
  MoreVerticalIcon,
  PencilIcon,
  ExternalLinkIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProjectStatusBadge } from "@/components/projects/project-status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Project } from "@/lib/types"

function formatStorage(mb?: number) {
  if (!mb) return "0 MB"
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

interface Props {
  project: Project
  canManage?: boolean
  showMeta?: boolean
  onToggleStatus?: (project: Project) => void
  className?: string
}

export function ProjectListRow({ project, canManage = false, showMeta = true, onToggleStatus, className }: Props) {
  const membros = project.participantesIds?.length ?? 0
  const suspenso = project.status === "suspenso"

  return (
    <div className={cn("relative flex items-center gap-4 bg-card px-4 py-3 transition-colors hover:bg-muted/40", className)}>
      <Link
        href={`/projetos/${project.id}`}
        className="absolute inset-0 z-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`Abrir projeto ${project.nome}`}
      />

      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/15">
        <FolderIcon className="size-4 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{project.nome}</p>
        {showMeta && <p className="truncate text-sm text-muted-foreground">
          {project.areaResponsavel} · <span className="font-mono text-xs">{project.codigo ?? project.id}</span>
        </p>}
      </div>

      <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
        <UsersIcon className="size-3.5" />
        {membros}
      </div>
      <div className="hidden w-24 items-center gap-1.5 text-sm text-muted-foreground md:flex">
        <DatabaseIcon className="size-3.5" />
        {formatStorage(project.armazenamentoUsadoMb)}
      </div>

      <ProjectStatusBadge status={project.status} />

      {canManage && (
        <div className="relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Ações do projeto" />}
              nativeButton={false}
            >
              <MoreVerticalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/projetos/${project.id}`} />}>
                <ExternalLinkIcon />
                Abrir
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`/projetos/${project.id}`} />}>
                <PencilIcon />
                Editar no projeto
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant={suspenso ? "default" : "destructive"}
                onClick={() => onToggleStatus?.(project)}
              >
                {suspenso ? <PlayIcon /> : <PauseIcon />}
                {suspenso ? "Reativar" : "Desativar"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
