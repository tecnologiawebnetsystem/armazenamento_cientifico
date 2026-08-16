import { FolderIcon, FileTextIcon, ImageIcon, FileArchiveIcon, FileCogIcon, FileIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FileNode } from "@/lib/types"

/** Escolhe o ícone apropriado com base no tipo do nó (pasta/arquivo) e no mimeType. */
export function FileTypeIcon({ file, className }: { file: Pick<FileNode, "tipo" | "mimeType">; className?: string }) {
  if (file.tipo === "pasta") {
    return <FolderIcon className={cn("text-primary", className)} />
  }

  const mime = file.mimeType ?? ""

  if (mime.startsWith("image/")) {
    return <ImageIcon className={cn("text-muted-foreground", className)} />
  }
  if (mime === "application/pdf" || mime.includes("word") || mime.includes("document")) {
    return <FileTextIcon className={cn("text-muted-foreground", className)} />
  }
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("kmz")) {
    return <FileArchiveIcon className={cn("text-muted-foreground", className)} />
  }
  if (mime === "application/octet-stream") {
    return <FileCogIcon className={cn("text-muted-foreground", className)} />
  }

  return <FileIcon className={cn("text-muted-foreground", className)} />
}
