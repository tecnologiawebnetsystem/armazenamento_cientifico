"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  FolderPlusIcon,
  FoldersIcon,
  LayersIcon,
  CircleCheckIcon,
  PauseCircleIcon,
  DatabaseIcon,
} from "lucide-react"
import { useProjects } from "@/hooks/use-projects"
import { useSession } from "@/hooks/use-session"
import { updateProject } from "@/lib/api-client"
import { ProjectCard } from "@/components/projects/project-card"
import {
  ProjectFilters,
  type StatusFilter,
  type SortOption,
  type ViewMode,
} from "@/components/projects/project-filters"
import { ProjectListRow } from "@/components/projects/project-list-row"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import type { Project } from "@/lib/types"

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof LayersIcon
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <div className={`flex size-10 items-center justify-center rounded-lg ${accent ?? "bg-primary/10 text-primary"}`}>
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-semibold leading-none tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

function formatStorage(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

export function ProjectsList({ canCreate }: { canCreate: boolean }) {
  const { projects, isLoading, refresh } = useProjects()
  const { user } = useSession()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("todos")
  const [area, setArea] = useState("todas")
  const [sort, setSort] = useState<SortOption>("recentes")
  const [view, setView] = useState<ViewMode>("grade")
  const [target, setTarget] = useState<Project | null>(null)
  const [pending, setPending] = useState(false)

  const areas = useMemo(
    () => Array.from(new Set(projects.map((p) => p.areaResponsavel).filter(Boolean))).sort(),
    [projects],
  )

  const canManage = (project: Project) =>
    user?.role === "admin" || (user ? project.gestoresIds?.includes(user.id) : false)

  const stats = useMemo(() => {
    const ativos = projects.filter((p) => p.status === "ativo").length
    const suspensos = projects.filter((p) => p.status === "suspenso").length
    const armazenamento = projects.reduce((acc, p) => acc + (p.armazenamentoUsadoMb ?? 0), 0)
    return { total: projects.length, ativos, suspensos, armazenamento }
  }, [projects])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = projects.filter((p) => {
      const matchesStatus = status === "todos" || p.status === status
      const matchesArea = area === "todas" || p.areaResponsavel === area
      const matchesSearch =
        !term ||
        p.nome.toLowerCase().includes(term) ||
        p.areaResponsavel.toLowerCase().includes(term) ||
        (p.codigo ?? "").toLowerCase().includes(term)
      return matchesStatus && matchesArea && matchesSearch
    })

    return [...list].sort((a, b) => {
      if (sort === "nome") return a.nome.localeCompare(b.nome, "pt-BR")
      if (sort === "armazenamento") return (b.armazenamentoUsadoMb ?? 0) - (a.armazenamentoUsadoMb ?? 0)
      // recentes
      return (b.criadoEm ?? "").localeCompare(a.criadoEm ?? "")
    })
  }, [projects, search, status, area, sort])

  async function confirmToggle() {
    if (!target) return
    const novoStatus = target.status === "suspenso" ? "ativo" : "suspenso"
    setPending(true)
    try {
      await updateProject(target.id, { status: novoStatus })
      await refresh()
      toast.success(novoStatus === "suspenso" ? "Projeto desativado." : "Projeto reativado.")
      setTarget(null)
    } catch {
      toast.error("Não foi possível atualizar o projeto.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={LayersIcon} label="Projetos" value={stats.total} />
        <StatCard
          icon={CircleCheckIcon}
          label="Ativos"
          value={stats.ativos}
          accent="bg-success/10 text-success"
        />
        <StatCard
          icon={PauseCircleIcon}
          label="Suspensos"
          value={stats.suspensos}
          accent="bg-warning/10 text-warning"
        />
        <StatCard
          icon={DatabaseIcon}
          label="Armazenamento"
          value={formatStorage(stats.armazenamento)}
          accent="bg-accent/15 text-accent-foreground"
        />
      </div>

      <ProjectFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        area={area}
        onAreaChange={setArea}
        areas={areas}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FoldersIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum projeto encontrado</EmptyTitle>
            <EmptyDescription>
              {projects.length === 0
                ? "Você ainda não participa de nenhum projeto científico."
                : "Ajuste os filtros de busca para encontrar o que procura."}
            </EmptyDescription>
          </EmptyHeader>
          {canCreate && projects.length === 0 && (
            <EmptyContent>
              <Button render={<Link href="/projetos/novo" />} nativeButton={false}>
                <FolderPlusIcon data-icon="inline-start" />
                Criar primeiro projeto
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : view === "grade" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              canManage={canManage(project)}
              onToggleStatus={setTarget}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          {filtered.map((project, i) => (
            <ProjectListRow
              key={project.id}
              project={project}
              canManage={canManage(project)}
              onToggleStatus={setTarget}
              className={i > 0 ? "border-t" : ""}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.status === "suspenso" ? "Reativar projeto?" : "Desativar projeto?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.status === "suspenso"
                ? `O projeto "${target?.nome}" voltará a ficar ativo e acessível aos membros.`
                : `O projeto "${target?.nome}" ficará suspenso. Os dados são mantidos, mas o projeto sai da operação ativa.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle} disabled={pending}>
              {pending ? "Processando..." : target?.status === "suspenso" ? "Reativar" : "Desativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
