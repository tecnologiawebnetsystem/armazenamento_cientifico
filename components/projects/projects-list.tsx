"use client"

import { useMemo, useState, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  FolderPlusIcon,
  FoldersIcon,
  LayersIcon,
  CircleCheckIcon,
  PauseCircleIcon,
  DatabaseIcon,
  Columns3Icon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react"
import { useProjects } from "@/hooks/use-projects"
import { useCatalogs } from "@/hooks/use-catalogs"
import { useSession } from "@/hooks/use-session"
import { recordAuditEvent, updateProject } from "@/lib/api-client"
import { ProjectCard } from "@/components/projects/project-card"
import {
  ProjectFilters,
  type StatusFilter,
  type SortOption,
  type ViewMode,
} from "@/components/projects/project-filters"
import { ProjectListRow } from "@/components/projects/project-list-row"
import { Skeleton } from "@/components/ui/skeleton"
import { Button, buttonVariants } from "@/components/ui/button"
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
    <div className="sigac-surface flex items-center gap-3 rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--sigac-shadow-hover)]">
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const initialSearch = searchParams.get("nome") ?? ""
  const initialStatus = (searchParams.get("status") as StatusFilter) || "todos"
  const initialArea = searchParams.get("area") ?? "todas"
  const pageSize = 15
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
  const { projects, refresh, isLoading } = useProjects({ nome: initialSearch, status: initialStatus, area: initialArea === "todas" ? undefined : initialArea, limit: 500 })
  const { areas: catalogAreas } = useCatalogs()
  const { user } = useSession()
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState<StatusFilter>(initialStatus)
  const [area, setArea] = useState(initialArea)
  const [sort, setSort] = useState<SortOption>("recentes")
  const [view, setView] = useState<ViewMode>("grade")
  const [showMeta, setShowMeta] = useState(true)
  const [target, setTarget] = useState<Project | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const current = searchParams.toString()
    const next = new URLSearchParams(current)
    if (search) next.set("nome", search)
    else next.delete("nome")
    if (status !== "todos") next.set("status", status)
    else next.delete("status")
    if (area !== "todas") next.set("area", area)
    else next.delete("area")
    // Evita substituir a mesma URL em toda renderização e causar um loop de navegação.
    if (next.toString() !== current) {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    }
  }, [search, status, area, pathname, router, searchParams])

  const areas = useMemo(
    () => catalogAreas.map((area) => area.nome).filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [catalogAreas],
  )

  const canManage = () => user?.perfilId === "ADM" || user?.role === "admin"


  const stats = useMemo(() => {
    const ativos = projects.filter((p) => p.status === "ativo").length
    const pausados = projects.filter((p) => p.status === "pausado").length
    const armazenamento = projects.reduce((acc, p) => acc + (p.armazenamentoUsadoMb ?? 0), 0)
    return { total: projects.length, ativos, pausados, armazenamento }
  }, [projects])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const uniqueProjects = Array.from(new Map(projects.map((project) => [project.id, project])).values())
    const list = uniqueProjects.filter((p) => {
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(currentPage, totalPages)
  const visibleProjects = filtered.slice((page - 1) * pageSize, page * pageSize)

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(searchParams.toString())
    next.set("page", String(Math.min(Math.max(1, nextPage), totalPages)))
    router.push(`${pathname}?${next.toString()}`, { scroll: false })
  }

  async function confirmToggle() {
    if (!target) return
    const novoStatus = target.status === "pausado" ? "ativo" : "pausado"
    setPending(true)
    try {
      await updateProject(target.id, { status: novoStatus })
      void recordAuditEvent({ action: "alterar_status", entity: "projeto", entity_id: target.id, details: { projeto: target.nome, codigo: target.codigo, status_anterior: target.status, status_novo: novoStatus } }).catch(() => undefined)
      await refresh()
      toast.success(novoStatus === "pausado" ? "Projeto desativado." : "Projeto reativado.")
      setTarget(null)
    } catch {
      toast.error("Não foi possível atualizar o projeto.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="sigac-surface overflow-hidden rounded-2xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-petrobras-green">Gestão científica</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-petrobras-blue">Projetos</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Acompanhe projetos, áreas responsáveis, acessos e armazenamento em um só lugar.</p>
          </div>
          {canCreate && <Link href="/projetos/novo" className={buttonVariants({ className: "bg-petrobras-green text-primary-foreground shadow-sm shadow-petrobras-green/20 hover:-translate-y-0.5 hover:bg-petrobras-green/90 hover:shadow-md" })}><FolderPlusIcon data-icon="inline-start" />Novo projeto</Link>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo dos projetos">
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
          value={stats.pausados}
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
        onSearchChange={(value) => { setSearch(value); goToPage(1) }}
        status={status}
        onStatusChange={(value) => { setStatus(value); goToPage(1) }}
        area={area}
        onAreaChange={(value) => { setArea(value); goToPage(1) }}
        areas={areas}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span aria-live="polite">Exibindo {visibleProjects.length} de {filtered.length} projetos</span><div className="flex items-center gap-3"><Button nativeButton variant="ghost" size="sm" onClick={() => void refresh()}><RefreshCwIcon data-icon="inline-start" />Atualizar</Button><Button nativeButton variant="ghost" size="sm" onClick={() => { setSearch(""); setStatus("todos"); setArea("todas") }} disabled={!search && status === "todos" && area === "todas"}><XIcon data-icon="inline-start" />Limpar filtros</Button><label className="flex items-center gap-2"><Columns3Icon className="size-4" /><input type="checkbox" checked={showMeta} onChange={(event) => setShowMeta(event.target.checked)} />Mostrar detalhes</label></div></div>

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
              <Link href="/projetos/novo" className={buttonVariants()}>
                <FolderPlusIcon data-icon="inline-start" />
                Criar primeiro projeto
              </Link>
            </EmptyContent>
          )}
        </Empty>
      ) : view === "grade" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              showMeta={showMeta}
              canManage={canManage()}
              onToggleStatus={setTarget}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          {visibleProjects.map((project, i) => (
            <ProjectListRow
              key={project.id}
              project={project}
              showMeta={showMeta}
              canManage={canManage()}
              onToggleStatus={setTarget}
              className={i > 0 ? "border-t" : ""}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Paginação de projetos">
          <p className="text-sm text-muted-foreground">Página {page} de {totalPages} · {filtered.length} projetos</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button nativeButton variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Anterior</Button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <Button key={pageNumber} nativeButton variant={pageNumber === page ? "default" : "outline"} size="sm" aria-current={pageNumber === page ? "page" : undefined} aria-label={`Ir para a página ${pageNumber}`} onClick={() => goToPage(pageNumber)}>
                {pageNumber}
              </Button>
            ))}
            <Button nativeButton variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Próxima</Button>
          </div>
        </nav>
      )}

      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.status === "pausado" ? "Reativar projeto?" : "Desativar projeto?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.status === "pausado"
                ? `O projeto "${target?.nome}" voltará a ficar ativo e acessível aos membros.`
                : `O projeto "${target?.nome}" ficará pausado. Os dados são mantidos, mas o projeto sai da operação ativa.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle} disabled={pending}>
              {pending ? "Processando..." : target?.status === "pausado" ? "Reativar" : "Desativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
