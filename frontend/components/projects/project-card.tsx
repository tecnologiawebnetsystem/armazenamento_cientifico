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
  ShieldCheckIcon,
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProjectStatusBadge } from "@/components/projects/project-status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
}

export function ProjectCard({ project, canManage = false, showMeta = true, onToggleStatus }: Props) {
  const membros = project.participantesIds?.length ?? 0
  const gestores = project.gestoresIds?.length ?? 0
  const suspenso = project.status === "suspenso"

  return (
    <Card className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      {/* Faixa superior com a cor da marca */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary to-accent"
      />

      {/* Link que cobre o card inteiro para navegação */}
      <Link
        href={`/projetos/${project.id}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`Abrir projeto ${project.nome}`}
      />

      <CardHeader className="pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/15">
            <FolderIcon className="size-4 text-primary" />
          </div>
          <div className="relative z-10 flex items-center gap-1.5">
            <ProjectStatusBadge status={project.status} />
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Ações do projeto" />
                  }
                  nativeButton
                >
                  <MoreVerticalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link href={`/projetos/${project.id}`} />}>
                    <ExternalLinkIcon />
                    Abrir
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href={`/projetos/${project.id}?aba=informacoes`} />}>
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
            )}
          </div>
        </div>
        <CardTitle className="text-balance leading-snug">{project.nome}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{project.areaResponsavel}</span>
        {showMeta && <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span>{project.codigo ?? project.id}</span>
          {gestores > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5"><ShieldCheckIcon className="size-3" />{gestores} {gestores === 1 ? "gestor" : "gestores"}</span>}
        </div>}
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
  )
}
