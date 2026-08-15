"use client"

import { FolderIcon, FileIcon, FoldersIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useFiles } from "@/hooks/use-files"

function formatBytes(bytes?: number) {
  if (!bytes) return ""
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export function ProjectFilesPreview({ projectId }: { projectId: string }) {
  const { files, isLoading } = useFiles(projectId, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Arquivos do projeto</CardTitle>
        <CardDescription>
          Pastas e arquivos armazenados na raiz do projeto. O explorador completo (upload, compartilhamento e
          organização em pastas) estará disponível em breve nesta aba.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FoldersIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhum arquivo ainda</EmptyTitle>
              <EmptyDescription>Faça upload de arquivos e crie pastas no explorador do projeto.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-1">
            {files.slice(0, 8).map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                {f.tipo === "pasta" ? (
                  <FolderIcon className="size-4 shrink-0 text-primary" />
                ) : (
                  <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{f.nome}</span>
                {f.tamanho ? (
                  <span className="text-xs text-muted-foreground">{formatBytes(f.tamanho)}</span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
