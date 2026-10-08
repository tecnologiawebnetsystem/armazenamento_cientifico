"use client"

import { useMemo, useState } from "react"
import { ChevronRightIcon, FolderIcon, FoldersIcon, SearchIcon, SearchXIcon } from "lucide-react"
import useSWR from "swr"
import { getFolders } from "@/lib/api-client"
import type { FileNode } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"

function folderName(folder: FileNode) {
  return folder.nome ?? folder.name ?? "Pasta sem nome"
}

function parentId(folder: FileNode) {
  return folder.parentId ?? (folder as FileNode & { parent_id?: string | null }).parent_id ?? null
}

export function ProjectFileExplorer({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useSWR(["project-folders", projectId], () => getFolders(projectId))
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const folders = useMemo(() => (data?.folders ?? []).filter((folder) => folder.tipo !== "arquivo"), [data?.folders])
  const currentFolder = folders.find((folder) => folder.id === currentFolderId)
  const children = useMemo(
    () => folders.filter((folder) => parentId(folder) === currentFolderId).sort((a, b) => folderName(a).localeCompare(folderName(b), "pt-BR")),
    [folders, currentFolderId],
  )
  const visibleFolders = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? folders.filter((folder) => folderName(folder).toLowerCase().includes(query)) : children
  }, [children, folders, search])

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrobras-green text-primary-foreground"><FoldersIcon className="size-5" aria-hidden="true" /></div>
            <div className="flex flex-col gap-1"><CardTitle className="text-xl tracking-tight">Pastas da área de rede</CardTitle><CardDescription>Visualize a estrutura real de pastas, sem arquivos e sem edição.</CardDescription></div>
          </div>
          <div className="flex flex-wrap gap-2"><Badge variant="secondary">{folders.length} {folders.length === 1 ? "pasta" : "pastas"}</Badge><Badge variant="outline">Somente leitura</Badge></div>
        </div>
        <CardAction className="sr-only">Somente leitura</CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <button type="button" className="shrink-0 font-medium text-foreground hover:underline disabled:cursor-default disabled:no-underline" onClick={() => setCurrentFolderId(null)} disabled={!currentFolderId}>Raiz</button>
            {currentFolder && <><ChevronRightIcon className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{folderName(currentFolder)}</span></>}
          </div>
          <InputGroup className="w-full sm:w-64"><InputGroupAddon><SearchIcon /></InputGroupAddon><InputGroupInput placeholder="Buscar todas as pastas..." value={search} onChange={(event) => setSearch(event.target.value)} /></InputGroup>
        </div>

        {isLoading ? <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-lg" />)}</div> : error ? <Empty><EmptyHeader><EmptyTitle>Não foi possível carregar as pastas</EmptyTitle><EmptyDescription>Verifique seu acesso ao projeto e tente novamente.</EmptyDescription></EmptyHeader></Empty> : visibleFolders.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon">{search.trim() ? <SearchXIcon /> : <FoldersIcon />}</EmptyMedia><EmptyTitle>{search.trim() ? "Nenhum resultado" : "Nenhuma pasta disponível"}</EmptyTitle><EmptyDescription>{search.trim() ? "Nenhuma pasta corresponde à busca." : "Este projeto ainda não possui pastas cadastradas."}</EmptyDescription></EmptyHeader></Empty> : <div className="overflow-hidden rounded-xl border border-border/80 bg-background"><div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{search.trim() ? "Resultado da busca" : currentFolder ? `Pastas em ${folderName(currentFolder)}` : "Pastas na raiz"}</div><div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleFolders.map((folder) => <button type="button" key={folder.id} onClick={() => { setSearch(""); setCurrentFolderId(folder.id) }} className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:border-petrobras-green/40 hover:bg-petrobras-green/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrobras-green"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-petrobras-green/10"><FolderIcon className="size-5 text-petrobras-green" aria-hidden="true" /></div><span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={folderName(folder)}>{folderName(folder)}</span><ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></button>)}</div></div>}
      </CardContent>
    </Card>
  )
}
