"use client"

import { useMemo, useRef, useState } from "react"
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
  Share2Icon,
  DownloadIcon,
  Trash2Icon,
  FoldersIcon,
  Loader2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFiles } from "@/hooks/use-files"
import { useProjectMembers } from "@/hooks/use-project-members"
import { shareLevelLabel } from "@/hooks/use-permissions"
import {
  createFileNode,
  deleteFileNode,
  shareFileNode,
  unshareFileNode,
  updateFileNode,
  ApiError,
} from "@/lib/api-client"
import type { FileNode, ShareLevel } from "@/lib/types"

function formatBytes(bytes?: number) {
  if (!bytes) return "—"
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
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

export function ProjectFileExplorer({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const { files, breadcrumb, isLoading, refresh } = useFiles(projectId, currentFolderId)
  const { members } = useProjectMembers(projectId)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const [shareTarget, setShareTarget] = useState<FileNode | null>(null)
  const [shareUserId, setShareUserId] = useState("")
  const [shareLevel, setShareLevel] = useState<ShareLevel>("leitura")
  const [isSharing, setIsSharing] = useState(false)

  const shareableMembers = useMemo(
    () => members.filter((m) => !shareTarget?.compartilhamentos.some((s) => s.userId === m.userId)),
    [members, shareTarget],
  )

  function memberById(userId: string) {
    return members.find((m) => m.userId === userId)?.user
  }

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

  async function handleShare() {
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

  function handleDownload(file: FileNode) {
    toast.info(`Simulação: em um ambiente real, o download de "${file.nome}" seria iniciado agora.`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Arquivos do projeto</CardTitle>
        <CardDescription>Organize pastas, envie arquivos e controle o compartilhamento por item.</CardDescription>
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

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FoldersIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhum arquivo aqui</EmptyTitle>
              <EmptyDescription>
                {canWrite ? "Envie arquivos ou crie pastas para começar." : "Esta pasta ainda não possui conteúdo."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
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
                {f.compartilhamentos.length > 0 && (
                  <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
                    <Share2Icon className="size-3" />
                    {f.compartilhamentos.length}
                  </Badge>
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
                    {f.tipo === "arquivo" && (
                      <DropdownMenuItem onClick={() => setPreviewTarget(f)}>
                        <EyeIcon />
                        Visualizar
                      </DropdownMenuItem>
                    )}
                    {f.tipo === "arquivo" && (
                      <DropdownMenuItem onClick={() => handleDownload(f)}>
                        <DownloadIcon />
                        Baixar
                      </DropdownMenuItem>
                    )}
                    {canWrite && (
                      <DropdownMenuItem
                        onClick={() => {
                          setRenameTarget(f)
                          setRenameValue(f.nome)
                        }}
                      >
                        <PencilIcon />
                        Renomear
                      </DropdownMenuItem>
                    )}
                    {canWrite && (
                      <DropdownMenuItem onClick={() => setShareTarget(f)}>
                        <Share2Icon />
                        Compartilhar
                      </DropdownMenuItem>
                    )}
                    {canWrite && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(f)}>
                          <Trash2Icon />
                          Excluir
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
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
            <DialogDescription>Escolha um novo nome para "{renameTarget?.nome}".</DialogDescription>
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

      {/* Excluir */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.nome}"?</AlertDialogTitle>
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
            <DialogDescription>Pré-visualização de conteúdo não disponível neste ambiente de demonstração.</DialogDescription>
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
                <span className="text-foreground">{memberById(previewTarget.criadoPor)?.nome ?? "—"}</span>
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

      {/* Compartilhar */}
      <Dialog open={shareTarget !== null} onOpenChange={(open) => !open && setShareTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar "{shareTarget?.nome}"</DialogTitle>
            <DialogDescription>Defina o nível de acesso de cada membro do projeto a este item.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {shareTarget && shareTarget.compartilhamentos.length > 0 && (
              <div className="flex flex-col gap-1">
                {shareTarget.compartilhamentos.map((s) => {
                  const user = memberById(s.userId)
                  return (
                    <div key={s.id} className="flex items-center gap-2 rounded-md px-1 py-1.5">
                      <Avatar className="size-7">
                        {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.nome} /> : null}
                        <AvatarFallback className="text-[10px]">{user ? initials(user.nome) : "?"}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{user?.nome ?? s.userId}</span>
                      <Badge variant="outline">{shareLevelLabel(s.nivel)}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleUnshare(s.userId)}
                        aria-label={`Remover compartilhamento de ${user?.nome ?? s.userId}`}
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    </div>
                  )
                })}
                <DropdownMenuSeparator />
              </div>
            )}

            {shareableMembers.length === 0 ? (
              <Empty className="py-4">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UsersIcon />
                  </EmptyMedia>
                  <EmptyDescription>Todos os membros do projeto já têm acesso a este item.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex items-end gap-2">
                <Select value={shareUserId} onValueChange={(v) => setShareUserId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um membro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {shareableMembers.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.user.nome}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select value={shareLevel} onValueChange={(v) => setShareLevel((v as ShareLevel) ?? "leitura")}>
                  <SelectTrigger className="w-40 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="leitura">Leitura</SelectItem>
                      <SelectItem value="edicao">Edição</SelectItem>
                      <SelectItem value="proprietario">Proprietário</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareTarget(null)}>
              Concluir
            </Button>
            {shareableMembers.length > 0 && (
              <Button onClick={handleShare} disabled={!shareUserId || isSharing}>
                {isSharing && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
                Compartilhar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
