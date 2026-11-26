"use client"

import { useCallback, useEffect, useState } from "react"
import useSWR from "swr"
import { AlertTriangleIcon, FolderLockIcon, RefreshCwIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getProjectFolderAccess,
  type FolderAccessStatus,
  type ProjectFolderAccessEntry,
} from "@/lib/api-client"

const STATUS: Record<
  FolderAccessStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  conforme: { label: "Conforme", variant: "default" },
  nivel_divergente: { label: "Nível divergente", variant: "destructive" },
  somente_rede: { label: "Só na rede", variant: "destructive" },
  somente_sigac: { label: "Só no SIGAC", variant: "secondary" },
  nao_verificado: { label: "Não verificado", variant: "outline" },
  papel_aplicacao: { label: "Papel da aplicação", variant: "outline" },
}

const LEVEL_LABEL: Record<string, string> = {
  leitura: "Leitura",
  escrita: "Escrita",
  administrador: "Administrador",
  especial: "Especial",
}

function levelLabel(level: string | null) {
  return level ? (LEVEL_LABEL[level] ?? level) : "—"
}

function FolderAccessRow({ entry }: { entry: ProjectFolderAccessEntry }) {
  const [open, setOpen] = useState(false)
  const status = STATUS[entry.situacao]
  const hasMembers = entry.membros.length > 0

  return (
    <>
      <TableRow>
        <TableCell className="max-w-72">
          <p className="font-medium break-all">{entry.grupo}</p>
          {entry.identificador && entry.identificador !== entry.grupo && (
            <p className="text-xs break-all text-muted-foreground">
              {entry.identificador}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            {entry.acessoAmplo && <Badge variant="destructive">Acesso amplo</Badge>}
            {entry.negado && <Badge variant="destructive">Negação</Badge>}
            {entry.herdado && <Badge variant="outline">Herdado</Badge>}
          </div>
        </TableCell>
        <TableCell>{levelLabel(entry.nivelSigac)}</TableCell>
        <TableCell>
          {levelLabel(entry.nivelRede)}
          {entry.direitosRede && (
            <p className="text-xs text-muted-foreground">{entry.direitosRede}</p>
          )}
        </TableCell>
        <TableCell>
          <Badge variant={status.variant}>{status.label}</Badge>
        </TableCell>
        <TableCell>
          {hasMembers ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {entry.membros.length}
              {entry.membrosTruncados ? "+" : ""}{" "}
              {open ? "ocultar" : "ver"}
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">
              {entry.tipo === "group" && entry.membrosFonte ? "0" : "—"}
            </span>
          )}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={5}>
            <ul className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {entry.membros.map((member) => (
                <li key={member.login} className="truncate">
                  <span className="font-medium">{member.login}</span>
                  {member.nome && member.nome !== member.login && (
                    <span className="text-muted-foreground"> — {member.nome}</span>
                  )}
                </li>
              ))}
            </ul>
            {entry.membrosTruncados && (
              <p className="mt-2 text-xs text-muted-foreground">
                Lista truncada pelo limite configurado.
              </p>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function ProjectFolderAccessPanel({ projectId }: { projectId: string }) {
  const [enabled, setEnabled] = useState(false)
  const { data, error, isValidating, mutate } = useSWR(
    enabled ? ["project-folder-access", projectId] : null,
    () => getProjectFolderAccess(projectId),
    { revalidateOnFocus: false }
  )

  // Escuta o evento disparado pelo ProjectFileExplorer após sync de ACL
  const handleSyncEvent = useCallback(
    (event: Event) => {
      const detail = (event as CustomEvent).detail as { projectId: string } | undefined
      if (detail?.projectId === projectId && enabled) {
        mutate()
      }
    },
    [projectId, enabled, mutate],
  )
  useEffect(() => {
    window.addEventListener("folder-access-sync", handleSyncEvent)
    return () => window.removeEventListener("folder-access-sync", handleSyncEvent)
  }, [handleSyncEvent])

  return (
    <section className="space-y-3 rounded-xl border border-border/80 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <FolderLockIcon className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <h3 className="text-base font-semibold">Acessos da pasta na rede</h3>
            <p className="text-sm text-muted-foreground">
              Compara os grupos do SIGAC com as permissões reais da pasta raiz e lista os membros.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isValidating}
          onClick={() => (enabled ? mutate() : setEnabled(true))}
        >
          <RefreshCwIcon className={isValidating ? "animate-spin" : ""} aria-hidden="true" />
          {data ? "Atualizar" : "Consultar pasta"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Não foi possível consultar a pasta."}
        </p>
      ) : isValidating && !data ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      ) : data ? (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="break-all">Pasta: {data.pasta || "não informada"}</span>
            {data.proprietario && <span>Proprietário: {data.proprietario}</span>}
            {data.herancaBloqueada !== null && (
              <span>Herança: {data.herancaBloqueada ? "bloqueada" : "ativa"}</span>
            )}
            <span>Consultado em {new Date(data.consultadoEm).toLocaleString("pt-BR")}</span>
          </div>

          {data.aclStatus !== "ok" && (
            <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
              {data.aclStatus === "sem_pasta"
                ? "Projeto sem pasta de rede cadastrada; exibindo apenas o cadastro do SIGAC."
                : `ACL indisponível: ${data.aclMensagem ?? "sem detalhes"}`}
            </p>
          )}

          {data.alertas.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="mb-1 flex items-center gap-2 font-medium">
                <AlertTriangleIcon className="size-4" aria-hidden="true" />
                Pontos para análise
              </p>
              <ul className="list-disc space-y-0.5 pl-5">
                {data.alertas.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </div>
          )}

          {data.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum acesso encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo / identidade</TableHead>
                  <TableHead>Nível SIGAC</TableHead>
                  <TableHead>Permissão na rede</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Membros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map((entry) => (
                  <FolderAccessRow
                    key={`${entry.sid ?? ""}-${entry.identificador ?? ""}-${entry.grupo}`}
                    entry={entry}
                  />
                ))}
              </TableBody>
            </Table>
          )}

          {data.avisos.length > 0 && (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {data.avisos.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  )
}
