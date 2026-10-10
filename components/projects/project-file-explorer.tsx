"use client"

import { useMemo, useState } from "react"
import { ChevronRightIcon, FolderIcon, FoldersIcon, Loader2Icon, RefreshCwIcon, SearchIcon, SearchXIcon, ShieldCheckIcon } from "lucide-react"
import useSWR from "swr"
import { ApiError, getFolderPermissions, getFolders, syncFolders } from "@/lib/api-client"
import type { FileNode } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function folderName(folder: FileNode) {
  return folder.nome ?? folder.name ?? "Pasta sem nome"
}

function parentId(folder: FileNode) {
  return folder.parentId ?? (folder as FileNode & { parent_id?: string | null }).parent_id ?? null
}

function folderSize(folder: FileNode) {
  return folder.tamanho ?? folder.sizeBytes ?? folder.size_bytes ?? 0
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** unitIndex).toLocaleString("pt-BR", { maximumFractionDigits: unitIndex === 0 ? 0 : 2 })} ${units[unitIndex]}`
}

export function ProjectFileExplorer({ projectId }: { projectId: string }) {
  const { data, isLoading, error, mutate } = useSWR(["project-folders", projectId], () => getFolders(projectId))
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  async function handleSync() {
    setIsSyncing(true)
    setSyncError(null)
    try {
      const synchronized = await syncFolders(projectId)
      await mutate(synchronized, { revalidate: false })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setSyncError("A atualização demorou mais que o esperado. A área de rede pode estar ocupada ou indisponível; tente novamente em instantes.")
      } else if (error instanceof ApiError && error.status === 503) {
        setSyncError("A área de rede está indisponível no momento. Verifique se o caminho está acessível e tente novamente.")
      } else if (error instanceof ApiError && error.status === 403) {
        setSyncError("Você não possui permissão para atualizar esta área de rede.")
      } else {
        setSyncError("Não foi possível concluir a atualização. Os dados exibidos continuam sendo os últimos dados salvos.")
      }
    } finally {
      setIsSyncing(false)
    }
  }
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const folders = useMemo(() => (data?.folders ?? []).filter((folder) => folder.tipo !== "arquivo"), [data?.folders])
  const [permissionsFolderId, setPermissionsFolderId] = useState<string | null>(null)
  const { data: permissionsData, isLoading: isLoadingPermissions, error: permissionsError } = useSWR(
    permissionsFolderId ? ["folder-permissions", projectId, permissionsFolderId] : null,
    () => getFolderPermissions(projectId, permissionsFolderId as string),
  )
  const permissionsFolder = folders.find((folder) => folder.id === permissionsFolderId)
  const totalSize = useMemo(() => folders.filter((folder) => parentId(folder) === null).reduce((total, folder) => total + folderSize(folder), 0), [folders])
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
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{folders.length} {folders.length === 1 ? "pasta" : "pastas"}</Badge><Badge variant="outline">Total: {formatBytes(totalSize)}</Badge><Badge variant="outline">Somente leitura</Badge><button type="button" onClick={handleSync} disabled={isSyncing} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-petrobras-green/30 bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-petrobras-green/10 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Atualizar pastas da área de rede">{isSyncing ? <Loader2Icon className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCwIcon className="size-4" aria-hidden="true" />}<span>{isSyncing ? "Atualizando..." : "Atualizar pastas"}</span></button></div>
        </div>
        <CardAction className="sr-only">Somente leitura</CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {syncError ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{syncError}</p> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <button type="button" className="shrink-0 font-medium text-foreground hover:underline disabled:cursor-default disabled:no-underline" onClick={() => setCurrentFolderId(null)} disabled={!currentFolderId}>Raiz</button>
            {currentFolder && <><ChevronRightIcon className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{folderName(currentFolder)}</span></>}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {currentFolder ? <button type="button" onClick={() => setPermissionsFolderId(currentFolder.id)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"><ShieldCheckIcon className="size-4" aria-hidden="true" />Permissões da pasta</button> : null}
            <InputGroup className="w-full sm:w-64"><InputGroupAddon><SearchIcon /></InputGroupAddon><InputGroupInput placeholder="Buscar todas as pastas..." value={search} onChange={(event) => setSearch(event.target.value)} /></InputGroup>
          </div>
        </div>

        {isLoading ? <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-lg" />)}</div> : error ? <Empty><EmptyHeader><EmptyTitle>Não foi possível carregar as pastas</EmptyTitle><EmptyDescription>Verifique seu acesso ao projeto e tente novamente.</EmptyDescription></EmptyHeader></Empty> : visibleFolders.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon">{search.trim() ? <SearchXIcon /> : <FoldersIcon />}</EmptyMedia><EmptyTitle>{search.trim() ? "Nenhum resultado" : "Nenhuma pasta disponível"}</EmptyTitle><EmptyDescription>{search.trim() ? "Nenhuma pasta corresponde à busca." : "Este projeto ainda não possui pastas cadastradas."}</EmptyDescription></EmptyHeader></Empty> : <div className="overflow-hidden rounded-xl border border-border/80 bg-background"><div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{search.trim() ? "Resultado da busca" : currentFolder ? `Pastas em ${folderName(currentFolder)}` : "Pastas na raiz"}</div><div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleFolders.map((folder) => <button type="button" key={folder.id} onClick={() => { setSearch(""); setCurrentFolderId(folder.id) }} className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:border-petrobras-green/40 hover:bg-petrobras-green/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrobras-green"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-petrobras-green/10"><FolderIcon className="size-5 text-petrobras-green" aria-hidden="true" /></div><span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={folderName(folder)}><span className="block truncate">{folderName(folder)}</span><span className="block text-xs font-normal text-muted-foreground">{formatBytes(folderSize(folder))}</span></span><ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></button>)}</div></div>}
      </CardContent>
      <Dialog open={Boolean(permissionsFolderId)} onOpenChange={(open) => !open && setPermissionsFolderId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheckIcon className="size-5 text-petrobras-green" aria-hidden="true" />Permissões de {permissionsFolder ? folderName(permissionsFolder) : "pasta"}</DialogTitle>
            <DialogDescription>Permissões efetivas encontradas na ACL do Windows. A consulta é somente leitura.</DialogDescription>
          </DialogHeader>
          {isLoadingPermissions ? <div className="flex flex-col gap-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : permissionsError ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">Não foi possível consultar as permissões desta pasta.</p> : <div className="overflow-hidden rounded-lg border"><div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span>Grupo ou usuário</span><span>Acesso</span><span>Herança</span></div><div className="max-h-[26rem] overflow-auto">{(permissionsData?.permissions ?? []).map((permission, index) => <div key={`${permission.identity}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-3 border-b px-3 py-3 text-sm last:border-b-0"><div className="min-w-0"><p className="truncate font-medium" title={permission.identity}>{permission.identity}</p><p className="mt-1 text-xs text-muted-foreground">{permission.rights.join(", ")}</p></div><Badge variant={permission.access_type === "Deny" ? "destructive" : "secondary"}>{permission.access_type === "Deny" ? "Negar" : "Permitir"}</Badge><span className="text-xs text-muted-foreground">{permission.inherited ? "Herdada" : "Direta"}</span></div>)}</div></div>}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
