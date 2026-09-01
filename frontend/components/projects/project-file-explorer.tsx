"use client"

import { useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import {
  FolderIcon,
  FolderPlusIcon,
  UploadIcon,
  MoreVerticalIcon,
  FileIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
  FileArchiveIcon,
  FileVideoIcon,
  FileAudioIcon,
  FileCode2Icon,
  ImageIcon,
  EyeIcon,
  PencilIcon,
  DownloadIcon,
  Trash2Icon,
  FoldersIcon,
  Loader2Icon,
  FolderInputIcon,
  SearchIcon,
  SearchXIcon,
} from "lucide-react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFiles } from "@/hooks/use-files"
import {
  createFileNode,
  deleteFileNode,
  getAllFolders,
  updateFileNode,
  ApiError,
} from "@/lib/api-client"
import type { FileNode } from "@/lib/types"

function formatBytes(bytes?: number) {
  if (!bytes) return "—"
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function FileTypeIcon({ file, className }: { file: FileNode; className?: string }) {
  if (file.tipo === "pasta") return <FolderIcon className={className ?? "size-4 shrink-0 text-primary"} />

  const mime = file.mimeType ?? ""
  const iconClassName = className ?? "size-4 shrink-0 text-muted-foreground"

  if (mime.startsWith("image/")) return <ImageIcon className={iconClassName} />
  if (mime.startsWith("video/")) return <FileVideoIcon className={iconClassName} />
  if (mime.startsWith("audio/")) return <FileAudioIcon className={iconClassName} />
  if (mime === "application/pdf") return <FileTextIcon className={iconClassName} />
  if (mime.includes("word") || mime.includes("document")) return <FileTextIcon className={iconClassName} />
  if (mime.includes("sheet") || mime.includes("excel") || mime === "text/csv")
    return <FileSpreadsheetIcon className={iconClassName} />
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("octet-stream"))
    return <FileArchiveIcon className={iconClassName} />
  if (mime.startsWith("text/") || mime.includes("json") || mime.includes("xml"))
    return <FileCode2Icon className={iconClassName} />
  return <FileIcon className={iconClassName} />
}

type FileAction = {
  key: string
  icon: typeof EyeIcon
  label: string
  onClick: () => void
  variant?: "destructive"
  separator?: boolean
}

export function ProjectFileExplorer({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const { files, breadcrumb, isLoading, refresh } = useFiles(projectId, currentFolderId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState("")

  const [isUploading, setIsUploading] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  const [renameTarget, setRenameTarget] = useState<FileNode | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [previewTarget, setPreviewTarget] = useState<FileNode | null>(null)

  const [moveTarget, setMoveTarget] = useState<FileNode | null>(null)
  const [moveDestination, setMoveDestination] = useState<string>("root")
  const [isMoving, setIsMoving] = useState(false)
  const { data: allFoldersData } = useSWR(
    moveTarget ? ["all-folders", projectId] : null,
    () => getAllFolders(projectId),
  )

  const moveDestinationOptions = useMemo(() => {
    if (!moveTarget || !allFoldersData) return []
    // não é possível mover uma pasta para dentro de si mesma
    return allFoldersData.files.filter((f) => f.id !== moveTarget.id)
  }, [allFoldersData, moveTarget])

  const visibleFiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return files
    return files.filter((f) => f.nome.toLowerCase().includes(q))
  }, [files, search])

  async function handleUploadFiles(fileList: FileList) {
    setIsUploading(true)
    try {
      for (const uploaded of Array.from(fileList)) {
        await createFileNode({
          projectId,
          parentId: currentFolderId,
          tipo: "arquivo",
          nome: uploaded.name,
          tamanho: uploaded.size,
          mimeType: uploaded.type || "application/octet-stream",
        })
      }
      toast.success(fileList.length > 1 ? `${fileList.length} arquivos enviados.` : "Arquivo enviado.")
      refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível enviar o arquivo."
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return
    setIsCreatingFolder(true)
    try {
      await createFileNode({ projectId, parentId: currentFolderId, tipo: "pasta", nome: newFolderName.trim() })
      toast.success("Pasta criada.")
      refresh()
      setNewFolderOpen(false)
      setNewFolderName("")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível criar a pasta."
      toast.error(message)
    } finally {
      setIsCreatingFolder(false)
    }
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return
    setIsRenaming(true)
    try {
      await updateFileNode(renameTarget.id, { nome: renameValue.trim() })
      toast.success("Item renomeado.")
      refresh()
      setRenameTarget(null)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível renomear o item."
      toast.error(message)
    } finally {
      setIsRenaming(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteFileNode(deleteTarget.id)
      toast.success(`"${deleteTarget.nome}" excluído.`)
      refresh()
      setDeleteTarget(null)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível excluir o item."
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  /* Compartilhamento por arquivo foi removido; o acesso é controlado por membros e permissões do projeto. */
  /* async function handleShare() {
    if (!shareTarget || !shareUserId) return
    setIsSharing(true)
    try {
      const { file } = await shareFileNode(shareTarget.id, shareUserId, shareLevel)
      setShareTarget(file)
      toast.success("Item compartilhado.")
      refresh()
      setShareUserId("")
      setShareLevel("leitura")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível compartilhar o item."
      toast.error(message)
    } finally {
      setIsSharing(false)
    }
  }

  async function handleUnshare(userId: string) {
    if (!shareTarget) return
    try {
      const { file } = await unshareFileNode(shareTarget.id, userId)
      setShareTarget(file)
      toast.success("Compartilhamento removido.")
      refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível remover o compartilhamento."
      toast.error(message)
    }
  }

  */

  async function handleMove() {
    if (!moveTarget) return
    setIsMoving(true)
    try {
      const parentId = moveDestination === "root" ? null : moveDestination
      await updateFileNode(moveTarget.id, { parentId })
      toast.success(`"${moveTarget.nome}" movido.`)
      refresh()
      setMoveTarget(null)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível mover o item."
      toast.error(message)
    } finally {
      setIsMoving(false)
    }
  }

  function handleDownload(file: FileNode) {
    toast.info(`Simulação: em um ambiente real, o download de "${file.nome}" seria iniciado agora.`)
  }

  /** Ações disponíveis para um item — compartilhadas entre o menu de contexto (clique direito) e o menu "⋮". */
  function getFileActions(f: FileNode): FileAction[] {
    return [
      f.tipo === "arquivo" && {
        key: "view",
        icon: EyeIcon,
        label: "Visualizar",
        onClick: () => setPreviewTarget(f),
      },
      f.tipo === "arquivo" && {
        key: "download",
        icon: DownloadIcon,
        label: "Baixar",
        onClick: () => handleDownload(f),
      },
      canWrite && {
        key: "rename",
        icon: PencilIcon,
        label: "Renomear",
        onClick: () => {
          setRenameTarget(f)
          setRenameValue(f.nome)
        },
      },
      canWrite && {
        key: "move",
        icon: FolderInputIcon,
        label: "Mover",
        onClick: () => {
          setMoveTarget(f)
          setMoveDestination(f.parentId ?? "root")
        },
      },
      canWrite && {
        key: "delete",
        icon: Trash2Icon,
        label: "Excluir",
        onClick: () => setDeleteTarget(f),
        variant: "destructive" as const,
        separator: true,
      },
    ].filter(Boolean) as FileAction[]
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrobras-green text-primary-foreground"><FoldersIcon className="size-5" aria-hidden="true" /></div><div className="flex flex-col gap-1"><CardTitle className="text-xl tracking-tight">Arquivos do projeto</CardTitle><CardDescription>Organize documentos e pastas com rapidez e segurança.</CardDescription></div></div>
          <Badge variant="secondary" className="w-fit">{visibleFiles.length} {visibleFiles.length === 1 ? "item" : "itens"}</Badge>
        </div>
        {canWrite && (
          <CardAction className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) handleUploadFiles(e.target.files)
                e.target.value = ""
              }}
            />
            <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
              <FolderPlusIcon data-icon="inline-start" />
              Nova pasta
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
              ) : (
                <UploadIcon data-icon="inline-start" />
              )}
              Enviar arquivos
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {currentFolderId === null ? (
                  <BreadcrumbPage>Raiz</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<button type="button" />} onClick={() => setCurrentFolderId(null)}>
                    Raiz
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {breadcrumb.map((node, i) => (
                <span key={node.id} className="contents">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {i === breadcrumb.length - 1 ? (
                      <BreadcrumbPage>{node.nome}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<button type="button" />} onClick={() => setCurrentFolderId(node.id)}>
                        {node.nome}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

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
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : visibleFiles.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {search.trim() ? <SearchXIcon /> : <FoldersIcon />}
              </EmptyMedia>
              <EmptyTitle>{search.trim() ? "Nenhum resultado" : "Nenhum arquivo aqui"}</EmptyTitle>
              <EmptyDescription>
                {search.trim()
                  ? "Nenhum item corresponde à busca nesta pasta."
                  : canWrite
                    ? "Envie arquivos ou crie pastas para começar."
                    : "Esta pasta ainda não possui conteúdo."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/80 bg-background">
            <div className="hidden grid-cols-[minmax(0,1fr)_80px_96px_36px] items-center gap-3 border-b bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid"><span>Nome</span><span className="text-right">Tamanho</span><span className="text-right">Atualizado</span><span /></div>
            <div className="flex flex-col divide-y divide-border">
            {visibleFiles.map((f) => {
              const actions = getFileActions(f)
              return (
                <ContextMenu key={f.id}>
                  <ContextMenuTrigger
                    render={<div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50" />}
                  >
                    <FileTypeIcon file={f} />
                    {f.tipo === "pasta" ? (
                      <button
                        type="button"
                        onClick={() => setCurrentFolderId(f.id)}
                        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground hover:underline"
                      >
                        {f.nome}
                      </button>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{f.nome}</span>
                    )}
                    <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground sm:block">
                      {f.tipo === "arquivo" ? formatBytes(f.tamanho) : "—"}
                    </span>
                    <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">
                      {formatDate(f.atualizadoEm)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8 shrink-0" />}>
                        <MoreVerticalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action) => (
                          <span key={action.key} className="contents">
                            {action.separator && <DropdownMenuSeparator />}
                            <DropdownMenuItem variant={action.variant} onClick={action.onClick}>
                              <action.icon />
                              {action.label}
                            </DropdownMenuItem>
                          </span>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {actions.map((action) => (
                      <span key={action.key} className="contents">
                        {action.separator && <ContextMenuSeparator />}
                        <ContextMenuItem variant={action.variant} onClick={action.onClick}>
                          <action.icon />
                          {action.label}
                        </ContextMenuItem>
                      </span>
                    ))}
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
            </div>
          </div>
        )}
      </CardContent>

      {/* Nova pasta */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova pasta</DialogTitle>
            <DialogDescription>Crie uma pasta na localização atual do explorador.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nome da pasta"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) handleCreateFolder()
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isCreatingFolder}>
              {isCreatingFolder && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              Criar pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renomear */}
      <Dialog open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear</DialogTitle>
            <DialogDescription>Escolha um novo nome para &quot;{renameTarget?.nome}&quot;.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) handleRename()
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim() || isRenaming}>
              {isRenaming && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mover */}
      <Dialog open={moveTarget !== null} onOpenChange={(open) => !open && setMoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover &quot;{moveTarget?.nome}&quot;</DialogTitle>
            <DialogDescription>Escolha a pasta de destino.</DialogDescription>
          </DialogHeader>
          <Select value={moveDestination} onValueChange={(v) => setMoveDestination(v ?? "root")}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: string) =>
                  value === "root" ? "Raiz" : moveDestinationOptions.find((f) => f.id === value)?.nome ?? value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="root">Raiz</SelectItem>
                {moveDestinationOptions.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.nome}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleMove}
              disabled={isMoving || (moveTarget?.parentId ?? "root") === moveDestination}
            >
              {isMoving && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &quot;{deleteTarget?.nome}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.tipo === "pasta"
                ? "Esta pasta e todo o seu conteúdo serão excluídos permanentemente."
                : "Este arquivo será excluído permanentemente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pré-visualização */}
      <Dialog open={previewTarget !== null} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewTarget && <FileTypeIcon file={previewTarget} className="size-5 text-primary" />}
              <span className="truncate">{previewTarget?.nome}</span>
            </DialogTitle>
            <DialogDescription>
              Pré-visualização de conteúdo não disponível neste ambiente de demonstração.
            </DialogDescription>
          </DialogHeader>
          {previewTarget && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-mono text-xs text-foreground">{previewTarget.mimeType ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Tamanho</span>
                <span className="text-foreground">{formatBytes(previewTarget.tamanho)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Enviado por</span>
                <span className="text-foreground">{previewTarget.criadoPor || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Última atualização</span>
                <span className="text-foreground">{formatDate(previewTarget.atualizadoEm)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => previewTarget && handleDownload(previewTarget)}>
              <DownloadIcon data-icon="inline-start" />
              Baixar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  )
}
