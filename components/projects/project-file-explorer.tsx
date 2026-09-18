"use client"

import { useMemo, useState } from "react"
import {
  FolderIcon,
  FoldersIcon,
  SearchIcon,
  SearchXIcon,
} from "lucide-react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import useSWR from "swr"
import { getFolders } from "@/lib/api-client"
function FolderIconBadge() {
  return <FolderIcon className="size-5 shrink-0 text-petrobras-green" aria-hidden="true" />
}

export function ProjectFileExplorer({ projectId }: { projectId: string }) {
  const { data, isLoading } = useSWR(["project-folders", projectId], () => getFolders(projectId))
  const [search, setSearch] = useState("")
  const visibleFolders = useMemo(() => {
    const folders = data?.folders ?? []
    const q = search.trim().toLowerCase()
    if (!q) return folders
    return folders.filter((folder) => folder.nome.toLowerCase().includes(q))
  }, [data?.folders, search])

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrobras-green text-primary-foreground"><FoldersIcon className="size-5" aria-hidden="true" /></div><div className="flex flex-col gap-1"><CardTitle className="text-xl tracking-tight">Pastas do projeto</CardTitle><CardDescription>Visualize a estrutura de pastas disponível neste projeto.</CardDescription></div></div>
          <Badge variant="secondary" className="w-fit">{visibleFolders.length} {visibleFolders.length === 1 ? "pasta" : "pastas"}</Badge>
        </div>
        <CardAction>
          <Badge variant="outline">Somente leitura</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Somente pastas — sem arquivos e sem ações de edição.</p>
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Buscar nesta pasta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : visibleFolders.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">{search.trim() ? <SearchXIcon /> : <FoldersIcon />}</EmptyMedia>
              <EmptyTitle>{search.trim() ? "Nenhum resultado" : "Nenhuma pasta disponível"}</EmptyTitle>
              <EmptyDescription>
                {search.trim() ? "Nenhuma pasta corresponde à busca." : "Este projeto ainda não possui pastas cadastradas."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/80 bg-background">
            <div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pastas disponíveis</div>
            <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleFolders.map((folder) => (
                <div key={folder.id} className="flex items-center gap-3 rounded-xl border border-border/80 bg-card px-4 py-4 transition-colors hover:border-petrobras-green/40 hover:bg-petrobras-green/5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-petrobras-green/10"><FolderIconBadge /></div>
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{folder.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>


    </Card>
  )
}
