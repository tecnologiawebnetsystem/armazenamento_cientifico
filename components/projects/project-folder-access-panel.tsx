"use client"

import { useState } from "react"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FolderLockIcon,
  RefreshCwIcon,
} from "lucide-react"
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
  getFolders,
  getProjectFolderAccess,
  syncProjectGroups,
  type FolderAccessStatus,
  type ProjectFolderAccess,
  type ProjectFolderAccessEntry,
} from "@/lib/api-client"
import { toast } from "sonner"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const STATUS: Record<
  FolderAccessStatus,
  {
    label: string
    variant: "default" | "secondary" | "outline" | "destructive"
  }
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

function isSecurityIdentifier(value: string) {
  return /^S-\d-\d+(?:-\d+)+$/i.test(value.trim())
}

function FolderAccessCard({ entry }: { entry: ProjectFolderAccessEntry }) {
  const status = STATUS[entry.situacao]
  const nameIsSid = isSecurityIdentifier(entry.grupo)
  const principalLabel =
    entry.tipo === "role"
      ? "Papel da aplicação"
      : entry.tipo === "group"
        ? "Grupo"
        : entry.tipo === "user"
          ? "Usuário"
          : entry.tipo === "wellknown"
            ? "Identidade conhecida do Windows"
            : entry.tipo === "unix"
              ? "Identidade UNIX"
              : "Identidade sem resolução no diretório"

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold break-all text-foreground">
            {nameIsSid ? "Nome não resolvido no diretório" : entry.grupo}
          </p>
          {nameIsSid && (
            <p className="mt-1 text-xs text-muted-foreground">
              O valor abaixo é um SID (identificador de segurança), não o nome
              do grupo.
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {principalLabel} · Fonte: {entry.fonteDiretorio}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge variant="outline">{principalLabel}</Badge>
          <Badge variant="secondary">Rede: {levelLabel(entry.nivelRede)}</Badge>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {entry.nivelSigac && (
          <div>
            <p className="text-xs text-muted-foreground">
              Nível cadastrado no SIGAC
            </p>
            <p>{levelLabel(entry.nivelSigac)}</p>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            Identificador do grupo
          </p>
          <code className="mt-1 block rounded-md bg-muted px-2 py-1 text-xs break-all text-muted-foreground">
            {entry.identificador || entry.sid || "Não informado"}
          </code>
        </div>
        {entry.sid &&
          entry.identificador &&
          entry.sid !== entry.identificador && (
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">SID da rede</p>
              <code className="mt-1 block rounded-md bg-muted px-2 py-1 text-xs break-all text-muted-foreground">
                {entry.sid}
              </code>
            </div>
          )}
      </div>
      <div className="flex flex-wrap gap-1">
        {entry.direitosRede && (
          <Badge variant="outline">{entry.direitosRede}</Badge>
        )}
        {entry.acessoAmplo && <Badge variant="destructive">Acesso amplo</Badge>}
        {entry.negado && <Badge variant="destructive">Negação explícita</Badge>}
        {entry.herdado && <Badge variant="outline">Permissão herdada</Badge>}
      </div>
    </article>
  )
}

export function ProjectFolderAccessPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ProjectFolderAccess | null>(null)
  const [folderCount, setFolderCount] = useState<number | null>(null)
  const [folderAccessError, setFolderAccessError] = useState<string | null>(
    null
  )
  const [isLoadingFolderAccess, setIsLoadingFolderAccess] = useState(false)
  const [isSyncingGroups, setIsSyncingGroups] = useState(false)
  const resolvedMembers = (data?.entries ?? []).flatMap((entry) =>
    entry.membros.length > 0
      ? entry.membros.map((member) => ({ ...member, entry }))
      : entry.tipo !== "group"
        ? [
            {
              login: entry.identificador || entry.grupo,
              nome: "",
              email: "",
              entry,
            },
          ]
        : []
  )
  const [syncResult, setSyncResult] = useState<{
    groups: number | null
    inserted: number | null
    skipped: number | null
    errors: number
    aclUnavailable: boolean
  } | null>(null)

  async function handleSyncGroups() {
    setIsSyncingGroups(true)
    setIsLoadingFolderAccess(true)
    setData(null)
    setFolderCount(null)
    setSyncResult(null)
    setFolderAccessError(null)
    try {
      const result = await syncProjectGroups(projectId)
      const summary = {
        groups: result.acl?.groups ?? null,
        inserted: result.acl?.inserted ?? null,
        skipped: result.acl?.skipped ?? null,
        errors: result.acl?.errors.length ?? 0,
        aclUnavailable: result.acl == null,
      }
      const [folderAccessResult, foldersResult] = await Promise.allSettled([
        getProjectFolderAccess(projectId),
        getFolders(projectId),
      ])
      if (folderAccessResult.status === "fulfilled") {
        setData(folderAccessResult.value)
      } else {
        const folderError = folderAccessResult.reason
        setFolderAccessError(
          folderError instanceof Error
            ? folderError.message
            : "Não foi possível consultar os grupos e membros da pasta."
        )
      }
      if (foldersResult.status === "fulfilled") {
        setFolderCount(
          foldersResult.value.folders.filter(
            (folder) => folder.tipo !== "arquivo"
          ).length
        )
      }
      setSyncResult({
        ...summary,
        groups:
          folderAccessResult.status === "fulfilled"
            ? folderAccessResult.value.entries.filter(
                (entry) => entry.tipo === "group"
              ).length
            : summary.groups,
      })
    } catch (syncError) {
      toast.error(
        syncError instanceof Error
          ? syncError.message
          : "Não foi possível sincronizar os grupos da rede."
      )
    } finally {
      setIsLoadingFolderAccess(false)
      setIsSyncingGroups(false)
    }
  }

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
              {(syncResult?.errors ?? 0) > 0 || syncResult?.aclUnavailable
                ? "Sincronização concluída com alertas"
                : "Grupos sincronizados"}
            </DialogTitle>
            <DialogDescription>
              {syncResult?.aclUnavailable
                ? "A API não retornou o detalhamento da sincronização. O total vem da consulta atual; inserções indisponíveis aparecem como traço."
                : "A operação foi concluída. Confira o resumo dos grupos da pasta de rede."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            {folderCount !== null && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Total de pastas</span>
                <span className="font-semibold">{folderCount}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Total de grupos</span>
              <span className="font-semibold">{syncResult?.groups ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Grupos sincronizados
              </span>
              <span className="font-semibold text-petrobras-green">
                {syncResult?.groups ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Novos registros nesta operação
              </span>
              <span className="font-semibold">
                {syncResult?.inserted ?? "—"}
              </span>
            </div>
            {(syncResult?.skipped ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Ignorados</span>
                <span className="font-semibold">{syncResult?.skipped}</span>
              </div>
            )}
            {(syncResult?.errors ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Falhas</span>
                <span className="font-semibold text-destructive">
                  {syncResult?.errors}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Fechar
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <section className="space-y-3 rounded-xl border border-border/80 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2">
            <FolderLockIcon
              className="mt-0.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-base font-semibold">
                Acessos da pasta na rede
              </h3>
              <p className="text-sm text-muted-foreground">
                Compara os grupos do SIGAC com as permissões reais da pasta raiz
                e lista os membros.
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            disabled={isSyncingGroups}
            onClick={() => void handleSyncGroups()}
          >
            <RefreshCwIcon
              data-icon="inline-start"
              className={isSyncingGroups ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {isSyncingGroups ? "Sincronizando grupos..." : "Sincronizar Grupos"}
          </Button>
        </div>

        {folderAccessError ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {folderAccessError}
          </p>
        ) : isLoadingFolderAccess && !data ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ) : data ? (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="break-all">
                Pasta: {data.pasta || "não informada"}
              </span>
              {data.proprietario && (
                <span>Proprietário: {data.proprietario}</span>
              )}
              {data.herancaBloqueada !== null && (
                <span>
                  Herança: {data.herancaBloqueada ? "bloqueada" : "ativa"}
                </span>
              )}
              <span>
                Consultado em{" "}
                {new Date(data.consultadoEm).toLocaleString("pt-BR")}
              </span>
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

            <section
              className="flex flex-col gap-3"
              aria-labelledby="folder-groups-title"
            >
              <div>
                <h4 id="folder-groups-title" className="text-sm font-semibold">
                  Grupos e permissões
                </h4>
                <p className="text-sm text-muted-foreground">
                  Identidades de grupo encontradas na pasta e o nível de acesso
                  atribuído.
                </p>
              </div>
              {data.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum grupo ou acesso encontrado.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.entries.map((entry) => (
                    <FolderAccessCard
                      key={`${entry.sid ?? ""}-${entry.identificador ?? ""}-${entry.grupo}`}
                      entry={entry}
                    />
                  ))}
                </div>
              )}
            </section>

            <section
              className="flex flex-col gap-3"
              aria-labelledby="folder-members-title"
            >
              <div>
                <h4 id="folder-members-title" className="text-sm font-semibold">
                  Membros e permissões
                </h4>
                <p className="text-sm text-muted-foreground">
                  Pessoas identificadas nos grupos da pasta e os acessos
                  herdados de cada grupo.
                </p>
              </div>
              {resolvedMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum membro individual foi identificado nos grupos
                  consultados.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Grupo de origem</TableHead>
                      <TableHead>Permissão</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedMembers.map(({ entry, ...member }) => (
                      <TableRow
                        key={`${entry.sid ?? entry.grupo}-${member.login}`}
                      >
                        <TableCell>
                          <p className="font-medium">
                            {member.nome || member.login}
                          </p>
                          {member.nome && member.nome !== member.login && (
                            <p className="text-xs text-muted-foreground">
                              {member.login}
                            </p>
                          )}
                          {member.email && (
                            <p className="text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="break-all">
                          {entry.grupo}
                        </TableCell>
                        <TableCell>
                          {levelLabel(entry.nivelRede)}
                          {entry.direitosRede && (
                            <p className="text-xs text-muted-foreground">
                              {entry.direitosRede}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS[entry.situacao].variant}>
                            {STATUS[entry.situacao].label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {data.entries.some((entry) => entry.membrosTruncados) && (
                <p className="text-xs text-muted-foreground">
                  A lista de membros está limitada pelo diretório.
                </p>
              )}
            </section>

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
    </>
  )
}
