"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  FolderIcon,
  FileIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
  FileArchiveIcon,
  FileVideoIcon,
  FileAudioIcon,
  FileCode2Icon,
  ImageIcon,
  EyeIcon,
  DownloadIcon,
  FoldersIcon,
  SearchIcon,
  SearchXIcon,
} from "lucide-react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useFiles } from "@/hooks/use-files"
import type { FileNode } from "@/lib/types"

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

export function ProjectFileExplorer({ projectId }: { projectId: string }) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const { files, breadcrumb, isLoading } = useFiles(projectId, currentFolderId)
  const [search, setSearch] = useState("")
  const visibleFiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return files
    return files.filter((f) => f.nome.toLowerCase().includes(q))
  }, [files, search])

  function handleDownload(file: FileNode) {
    toast.info(`Simulação: em um ambiente real, o download de "${file.nome}" seria iniciado agora.`)
  }

  function getFileActions(f: FileNode): FileAction[] {
    return f.tipo === "arquivo"
      ? [
          { key: "view", icon: EyeIcon, label: "Visualizar", onClick: () => toast.info(`Visualização: ${f.nome}`) },
          { key: "download", icon: DownloadIcon, label: "Baixar", onClick: () => handleDownload(f) },
        ]
      : []
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrobras-green text-primary-foreground"><FoldersIcon className="size-5" aria-hidden="true" /></div><div className="flex flex-col gap-1"><CardTitle className="text-xl tracking-tight">Arquivos do projeto</CardTitle><CardDescription>Consulte somente as pastas autorizadas deste projeto.</CardDescription></div></div>
          <Badge variant="secondary" className="w-fit">{visibleFiles.length} {visibleFiles.length === 1 ? "item" : "itens"}</Badge>
        </div>
        <CardAction>
          <Badge variant="outline">Somente leitura</Badge>
        </CardAction>
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
              <EmptyTitle>{search.trim() ? "Nenhum resultado" : "Nenhuma pasta aqui"}</EmptyTitle>
              <EmptyDescription>
                {search.trim()
                  ? "Nenhum item corresponde à busca nesta pasta."
                  : "Esta pasta ainda não possui conteúdo consultável."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/80 bg-background">
            <div className="hidden grid-cols-[minmax(0,1fr)_80px] items-center gap-3 border-b bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid"><span>Pasta</span><span className="text-right">Tamanho</span></div>
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
                    <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground sm:block">—</span>
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


    </Card>
  )
}
