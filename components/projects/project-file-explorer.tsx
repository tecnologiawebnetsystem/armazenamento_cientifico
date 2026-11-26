"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2Icon,
  DatabaseIcon,
  FolderIcon,
  FoldersIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  SearchXIcon,
} from "lucide-react"
import useSWR from "swr"
import { AUDIT_ACTIONS } from "@/lib/audit"
import {
  ApiError,
  getFolders,
  recordAuditEvent,
  syncFolders,
} from "@/lib/api-client"
import { toast } from "sonner"
import type { FileNode } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function folderName(folder: FileNode) {
  return folder.nome ?? folder.name ?? "Pasta sem nome"
}

function parentId(folder: FileNode) {
  return (
    folder.parentId ??
    (folder as FileNode & { parent_id?: string | null }).parent_id ??
    null
  )
}

function folderPath(folder: FileNode, foldersById: Map<string, FileNode>) {
  const path = [folderName(folder)]
  const visited = new Set([folder.id])
  let currentParentId = parentId(folder)

  while (currentParentId && !visited.has(currentParentId)) {
    const parent = foldersById.get(currentParentId)
    if (!parent) break
    visited.add(parent.id)
    path.unshift(folderName(parent))
    currentParentId = parentId(parent)
  }

  return path.join(" / ")
}

export function ProjectFileExplorer({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const { data, isLoading, error, mutate } = useSWR(
    ["project-folders", projectId],
    () => getFolders(projectId)
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    inserted: number
    updated: number
    total: number
    source: "rede" | "tabela"
    projectName: string
  } | null>(null)

  async function handleSync() {
    const startedAt = performance.now()
    const syncAttemptId = crypto.randomUUID()
    setIsSyncing(true)
    await recordAuditEvent({
      action: AUDIT_ACTIONS.SYNC_STARTED,
      entity: "projeto",
      entity_id: projectId,
      details: { projeto: projectName },
    }).catch(() => undefined)
    try {
      const result = await syncFolders(
        projectId,
        data?.folders ?? [],
        "folders"
      )
      await recordAuditEvent({
        action: AUDIT_ACTIONS.SYNC_SUCCEEDED,
        entity: "projeto",
        entity_id: projectId,
        details: {
          projeto: projectName,
          inseridos: result.inserted,
          atualizados: result.updated,
          total: result.folders.length,
          fonte: result.source,
          acl_grupos: result.acl?.groups ?? 0,
          acl_inseridos: result.acl?.inserted ?? 0,
        },
      }).catch(() => undefined)
      await mutate(result, false)
      if (result.inserted > 0 || result.folders.length > 0) {
        setSyncResult({
          inserted: result.inserted,
          updated: result.updated,
          total: result.folders.length,
          source: result.source,
          projectName,
        })
      } else {
        toast.error("Nenhuma pasta foi encontrada para cadastrar.")
      }
    } catch (syncError) {
      await recordAuditEvent({
        action: AUDIT_ACTIONS.SYNC_FAILED,
        entity: "projeto",
        entity_id: projectId,
        result: "erro",
        details: {
          projeto: projectName,
          motivo:
            syncError instanceof Error
              ? syncError.message
              : "Falha desconhecida",
          tipo_erro:
            syncError instanceof Error ? syncError.name : typeof syncError,
          status_http: syncError instanceof ApiError ? syncError.status : null,
          api_request_id:
            syncError instanceof ApiError ? syncError.requestId : null,
          metodo_http:
            syncError instanceof ApiError ? syncError.method : "POST",
          endpoint:
            syncError instanceof ApiError
              ? syncError.path
              : "/api/folders/sync",
          escopo: "folders",
          duracao_ms: Math.round(performance.now() - startedAt),
          tentativa_id: syncAttemptId,
        },
      }).catch(() => undefined)
      toast.error(
        syncError instanceof Error
          ? syncError.message
          : "Não foi possível atualizar a área de rede."
      )
    } finally {
      setIsSyncing(false)
    }
  }
  const [search, setSearch] = useState("")
  const folders = useMemo(
    () => (data?.folders ?? []).filter((folder) => folder.tipo !== "arquivo"),
    [data?.folders]
  )
  const folderPaths = useMemo(() => {
    const foldersById = new Map(
      folders.map((folder) => [folder.id, folder] as const)
    )
    return new Map(
      folders.map(
        (folder) => [folder.id, folderPath(folder, foldersById)] as const
      )
    )
  }, [folders])
  const visibleFolders = useMemo(() => {
    const query = search.trim().toLowerCase()
    const allFolders = folders.toSorted((left, right) =>
      (folderPaths.get(left.id) ?? folderName(left)).localeCompare(
        folderPaths.get(right.id) ?? folderName(right),
        "pt-BR"
      )
    )
    return query
      ? allFolders.filter((folder) =>
          (folderPaths.get(folder.id) ?? folderName(folder))
            .toLowerCase()
            .includes(query)
        )
      : allFolders
  }, [folders, folderPaths, search])

  return (
    <>
      <Dialog
        open={syncResult !== null}
        onOpenChange={(open) => {
          if (!open) setSyncResult(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex size-12 items-center justify-center rounded-full bg-petrobras-green/10 text-petrobras-green">
              <CheckCircle2Icon className="size-6" aria-hidden="true" />
            </div>
            <DialogTitle>
              {syncResult?.inserted
                ? "Pastas cadastradas com sucesso"
                : "Área de rede sincronizada"}
            </DialogTitle>
            <DialogDescription>
              {syncResult?.inserted
                ? `${syncResult.inserted} ${syncResult.inserted === 1 ? "pasta foi inserida" : "pastas foram inseridas"} na tabela de pastas.`
                : `${syncResult?.updated ?? 0} registros foram processados e tiveram os dados atualizados.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Área de rede</span>
              <span
                className="max-w-48 truncate font-medium"
                title={syncResult?.projectName}
              >
                {syncResult?.projectName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground">
                <DatabaseIcon className="size-4" aria-hidden="true" />
                Registros encontrados
              </span>
              <span className="font-semibold">{syncResult?.total ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Inseridos nesta operação
              </span>
              <span className="font-semibold text-petrobras-green">
                {syncResult?.inserted ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Registros atualizados
              </span>
              <span className="font-semibold">{syncResult?.updated ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Fonte da atualização
              </span>
              <span className="font-medium">
                {syncResult?.source === "rede"
                  ? "Área de rede"
                  : "Tabela local"}
              </span>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Fechar
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="border-b bg-muted/30 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrobras-green text-primary-foreground">
                <FoldersIcon className="size-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1">
                <CardTitle className="text-xl tracking-tight">
                  Pastas da área de rede
                </CardTitle>
                <CardDescription>
                  Visualize a estrutura real de pastas, sem arquivos e sem
                  edição.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant="secondary">
                  {folders.length} {folders.length === 1 ? "pasta" : "pastas"}
                </Badge>
                <Badge variant="outline">Somente leitura</Badge>
                {data?.source === "tabela" ||
                data?.source === "tabela-fallback" ? (
                  <Badge
                    className="border-petrobras-yellow/50 bg-petrobras-yellow/15 text-xs font-semibold text-foreground"
                    variant="outline"
                  >
                    <DatabaseIcon
                      className="size-3.5"
                      data-icon="inline-start"
                    />
                    Banco de dados
                  </Badge>
                ) : (
                  <Badge className="text-xs" variant="outline">
                    <FoldersIcon
                      className="size-3.5"
                      data-icon="inline-start"
                    />
                    Área de rede
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSync()}
                disabled={isSyncing}
              >
                <>
                  {isSyncing ? (
                    <Loader2Icon
                      className="animate-spin"
                      data-icon="inline-start"
                    />
                  ) : (
                    <RefreshCwIcon data-icon="inline-start" />
                  )}
                  {isSyncing ? "Lendo área de rede..." : "Sincronizar pastas"}
                </>
              </Button>
            </div>
          </div>
          <CardAction className="sr-only">Somente leitura</CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Rede</span>
              <span>Todas as pastas e subpastas da pasta raiz</span>
            </div>
            <InputGroup className="w-full sm:w-64">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Buscar todas as pastas..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </InputGroup>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[
                "folder-skeleton-1",
                "folder-skeleton-2",
                "folder-skeleton-3",
                "folder-skeleton-4",
                "folder-skeleton-5",
              ].map((key) => (
                <Skeleton key={key} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Não foi possível carregar as pastas</EmptyTitle>
                <EmptyDescription>
                  Verifique seu acesso ao projeto e tente novamente.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : visibleFolders.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {search.trim() ? <SearchXIcon /> : <FoldersIcon />}
                </EmptyMedia>
                <EmptyTitle>
                  {search.trim()
                    ? "Nenhum resultado"
                    : "Nenhuma pasta disponível"}
                </EmptyTitle>
                <EmptyDescription>
                  {search.trim()
                    ? "Nenhuma pasta corresponde à busca."
                    : "Este projeto ainda não possui pastas cadastradas."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/80 bg-background">
              <div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {search.trim() ? "Resultado da busca" : "Todas as pastas"}
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleFolders.map((folder) => {
                  const path = folderPaths.get(folder.id) ?? folderName(folder)
                  return (
                    <div
                      key={folder.id}
                      className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-3"
                      title={path}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-petrobras-green/10">
                        <FolderIcon
                          className="size-5 text-petrobras-green"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {folderName(folder)}
                        </span>
                        {path !== folderName(folder) && (
                          <span className="truncate text-xs text-muted-foreground">
                            {path}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
