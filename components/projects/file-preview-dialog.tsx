"use client"

import { DownloadIcon, InfoIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileTypeIcon } from "@/components/projects/file-icon"
import { formatBytes } from "@/lib/utils"
import { shareLevelLabel } from "@/hooks/use-permissions"
import type { FileNode, User } from "@/lib/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR")
}

function triggerStubDownload(file: FileNode) {
  const content = [
    `Arquivo simulado: ${file.nome}`,
    `Tipo: ${file.mimeType ?? "desconhecido"}`,
    `Tamanho: ${formatBytes(file.tamanho)}`,
    `Criado em: ${formatDate(file.criadoEm)}`,
    "",
    "Este é um conteúdo de demonstração. O ambiente local não armazena o binário original do arquivo.",
  ].join("\n")
  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${file.nome}.txt`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function FilePreviewDialog({
  file,
  usersById,
  open,
  onOpenChange,
}: {
  file: FileNode | null
  usersById: Map<string, User>
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileTypeIcon file={file} className="size-5 shrink-0" />
            <DialogTitle className="truncate">{file.nome}</DialogTitle>
          </div>
          <DialogDescription>Informações do arquivo armazenado no projeto.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Tamanho</span>
              <span className="text-foreground">{formatBytes(file.tamanho)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Tipo</span>
              <span className="truncate text-foreground">{file.mimeType ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Criado por</span>
              <span className="text-foreground">{usersById.get(file.criadoPor)?.nome ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Atualizado em</span>
              <span className="text-foreground">{formatDate(file.atualizadoEm)}</span>
            </div>
          </div>

          {file.compartilhamentos.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Compartilhado com</span>
              <div className="flex flex-col gap-1.5">
                {file.compartilhamentos.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground">{usersById.get(s.userId)?.nome ?? s.userId}</span>
                    <Badge variant="outline">{shareLevelLabel(s.nivel)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Pré-visualização de conteúdo não disponível neste ambiente de demonstração — apenas os metadados do
              arquivo são simulados.
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => triggerStubDownload(file)}>
            <DownloadIcon data-icon="inline-start" />
            Baixar (simulado)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
