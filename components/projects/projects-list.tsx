"use client"

import { useMemo, useState } from "react"
import { FolderPlusIcon, FoldersIcon } from "lucide-react"
import { useProjects } from "@/hooks/use-projects"
import { ProjectCard } from "@/components/projects/project-card"
import { ProjectFilters, type StatusFilter } from "@/components/projects/project-filters"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import Link from "next/link"

export function ProjectsList({ canCreate }: { canCreate: boolean }) {
  const { projects, isLoading } = useProjects()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("todos")

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesStatus = status === "todos" || p.status === status
      const term = search.trim().toLowerCase()
      const matchesSearch =
        !term || p.nome.toLowerCase().includes(term) || p.areaResponsavel.toLowerCase().includes(term)
      return matchesStatus && matchesSearch
    })
  }, [projects, search, status])

  return (
    <div className="flex flex-col gap-6">
      <ProjectFilters search={search} onSearchChange={setSearch} status={status} onStatusChange={setStatus} />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
