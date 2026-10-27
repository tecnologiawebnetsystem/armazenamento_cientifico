"use client"

import { useMemo, useState } from "react"
import { CheckCircle2Icon, DatabaseIcon, FolderIcon, FoldersIcon, Loader2Icon, RefreshCwIcon, SearchIcon, SearchXIcon } from "lucide-react"
import useSWR from "swr"
import { getFolders, recordAuditEvent, syncFolders } from "@/lib/api-client"
import { toast } from "sonner"
import type { FileNode } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function folderName(folder: FileNode) {
  return folder.nome ?? folder.name ?? "Pasta sem nome"
}

function parentId(folder: FileNode) {
  return folder.parentId ?? (folder as FileNode & { parent_id?: string | null }).parent_id ?? null
}

export function ProjectFileExplorer({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { data, isLoading, error, mutate } = useSWR(["project-folders", projectId], () => getFolders(projectId))
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ inserted: number; updated: number; total: number; source: "rede" | "tabela"; projectName: string } | null>(null)

  async function handleSync() {
    setIsSyncing(true)
    try {
      const result = await syncFolders(projectId, data?.folders ?? [])
      await recordAuditEvent({
        action: "atualizar-area-rede",
        entity: "projeto",
        entity_id: projectId,
        details: {
          projeto: projectName,
          inseridos: result.inserted,
          atualizados: result.updated,
          total: result.folders.length,
          fonte: result.source,
        },
      }).catch(() => undefined)
      await mutate(result, false)
      if (result.inserted > 0 || result.folders.length > 0) {
        setSyncResult({ inserted: result.inserted, updated: result.updated, total: result.folders.length, source: result.source, projectName })
      } else {
        toast.error("Nenhuma pasta foi encontrada para cadastrar.")
      }
    } catch (syncError) {
      toast.error(syncError instanceof Error ? syncError.message : "Não foi possível atualizar a área de rede.")
    } finally {
      setIsSyncing(false)
    }
  }
  const [search, setSearch] = useState("")
  const folders = useMemo(() => (data?.folders ?? []).filter((folder) => folder.tipo !== "arquivo"), [data?.folders])
  const rootFolders = useMemo(
    () => folders.filter((folder) => parentId(folder) === null).sort((a, b) => folderName(a).localeCompare(folderName(b), "pt-BR")),
    [folders],
  )
  const visibleFolders = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? folders.filter((folder) => folderName(folder).toLowerCase().includes(query)) : rootFolders
  }, [folders, rootFolders, search])

  return (
    <>
      <Dialog open={syncResult !== null} onOpenChange={(open) => { if (!open) setSyncResult(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex size-12 items-center justify-center rounded-full bg-petrobras-green/10 text-petrobras-green">
              <CheckCircle2Icon className="size-6" aria-hidden="true" />
            </div>
            <DialogTitle>{syncResult?.inserted ? "Pastas cadastradas com sucesso" : "Área de rede sincronizada"}</DialogTitle>
            <DialogDescription>
              {syncResult?.inserted
                ? `${syncResult.inserted} ${syncResult.inserted === 1 ? "pasta foi inserida" : "pastas foram inseridas"} na tabela de pastas.`
                : `${syncResult?.updated ?? 0} registros foram processados e tiveram os dados atualizados.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Área de rede</span>
              <span className="max-w-48 truncate font-medium" title={syncResult?.projectName}>{syncResult?.projectName}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground"><DatabaseIcon className="size-4" aria-hidden="true" />Registros encontrados</span>
              <span className="font-semibold">{syncResult?.total ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Inseridos nesta operação</span>
              <span className="font-semibold text-petrobras-green">{syncResult?.inserted ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Registros atualizados</span>
              <span className="font-semibold">{syncResult?.updated ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Fonte da atualização</span>
              <span className="font-medium">{syncResult?.source === "rede" ? "Área de rede" : "Tabela local"}</span>
            </div>
          </div>
          <DialogFooter><DialogClose render={<Button variant="outline" />}>Fechar</DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrobras-green text-primary-foreground"><FoldersIcon className="size-5" aria-hidden="true" /></div>
            <div className="flex flex-col gap-1"><CardTitle className="text-xl tracking-tight">Pastas da área de rede</CardTitle><CardDescription>Visualize a estrutura real de pastas, sem arquivos e sem edição.</CardDescription></div>
          </div>
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{folders.length} {folders.length === 1 ? "pasta" : "pastas"}</Badge><Badge variant="outline">Somente leitura</Badge><Button type="button" size="sm" onClick={() => void handleSync()} disabled={isSyncing}><>{isSyncing ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}Atualizar área de rede</></Button></div>
        </div>
        <CardAction className="sr-only">Somente leitura</CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Raiz</span>
            <span>Subpastas da área de rede</span>
          </div>
          <InputGroup className="w-full sm:w-64"><InputGroupAddon><SearchIcon /></InputGroupAddon><InputGroupInput placeholder="Buscar todas as pastas..." value={search} onChange={(event) => setSearch(event.target.value)} /></InputGroup>
        </div>

        {isLoading ? <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-lg" />)}</div> : error ? <Empty><EmptyHeader><EmptyTitle>Não foi possível carregar as pastas</EmptyTitle><EmptyDescription>Verifique seu acesso ao projeto e tente novamente.</EmptyDescription></EmptyHeader></Empty> : visibleFolders.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon">{search.trim() ? <SearchXIcon /> : <FoldersIcon />}</EmptyMedia><EmptyTitle>{search.trim() ? "Nenhum resultado" : "Nenhuma pasta disponível"}</EmptyTitle><EmptyDescription>{search.trim() ? "Nenhuma pasta corresponde à busca." : "Este projeto ainda não possui pastas cadastradas."}</EmptyDescription></EmptyHeader></Empty> : <div className="overflow-hidden rounded-xl border border-border/80 bg-background"><div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{search.trim() ? "Resultado da busca" : "Pastas na raiz"}</div><div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleFolders.map((folder) => <div key={folder.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-petrobras-green/10"><FolderIcon className="size-5 text-petrobras-green" aria-hidden="true" /></div><span className="min-w-0 truncate text-sm font-medium text-foreground" title={folderName(folder)}>{folderName(folder)}</span></div>)}</div></div>}
      </CardContent>
      </Card>
    </>
  )
}
