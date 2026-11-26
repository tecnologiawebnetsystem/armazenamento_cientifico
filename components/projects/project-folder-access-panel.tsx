"use client"

import { useState } from "react"
import useSWR from "swr"
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

function FolderAccessCard({ entry }: { entry: ProjectFolderAccessEntry }) {
  const status = STATUS[entry.situacao]
  const principalLabel =
    entry.tipo === "role"
      ? "Papel"
      : entry.tipo === "group"
        ? "Grupo"
        : entry.tipo === "user"
          ? "Usuário"
          : entry.tipo === "wellknown"
            ? "Identidade Windows"
            : entry.tipo === "unix"
              ? "Identidade UNIX"
              : "Identidade não resolvida"
  const accessBadgeClass =
    entry.nivelRede === "administrador"
      ? "border-primary/15 bg-primary/10 text-primary"
      : entry.nivelRede === "escrita"
        ? "border-accent/40 bg-accent/30 text-accent-foreground"
        : entry.nivelRede === "leitura"
          ? "border-secondary bg-secondary text-secondary-foreground"
          : "border-border bg-muted text-muted-foreground"

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-primary/15 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold break-all text-foreground">
            {entry.grupo}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Fonte: {entry.fonteDiretorio}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge variant="outline" className="border-primary/20 text-primary">
            {principalLabel}
          </Badge>
          <Badge variant="outline" className={accessBadgeClass}>
            {levelLabel(entry.nivelRede)}
          </Badge>
        </div>
      </div>
      <code className="block min-w-0 rounded-md border border-primary/10 bg-primary/5 px-3 py-2 text-xs break-all text-muted-foreground">
        {entry.identificador || entry.sid || "Não informado"}
      </code>
      {(entry.nivelSigac ||
        entry.sid !== entry.identificador ||
        entry.direitosRede ||
        entry.acessoAmplo ||
        entry.negado ||
        entry.herdado ||
        entry.situacao !== "conforme") && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
          {entry.nivelSigac && (
            <Badge variant="outline">
              SIGAC: {levelLabel(entry.nivelSigac)}
            </Badge>
          )}
          {entry.sid &&
            entry.identificador &&
            entry.sid !== entry.identificador && (
              <Badge variant="outline">SID: {entry.sid}</Badge>
            )}
          {entry.direitosRede && (
            <Badge variant="outline">{entry.direitosRede}</Badge>
          )}
          {entry.acessoAmplo && (
            <Badge variant="destructive">Acesso amplo</Badge>
          )}
          {entry.negado && (
            <Badge variant="destructive">Negação explícita</Badge>
          )}
          {entry.herdado && <Badge variant="outline">Permissão herdada</Badge>}
          {entry.situacao !== "conforme" && (
            <Badge variant={status.variant}>{status.label}</Badge>
          )}
        </div>
      )}
    </article>
  )
}

export function ProjectFolderAccessPanel({ projectId }: { projectId: string }) {
  const {
    data,
    isLoading: isLoadingFolderAccess,
    error: folderAccessError,
    mutate,
  } = useSWR(
    ["project-folder-access", projectId],
    () => getProjectFolderAccess(projectId),
    { revalidateOnFocus: false }
  )
  const [folderCount, setFolderCount] = useState<number | null>(null)
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
    members: number | null
    skipped: number | null
    errors: number
    aclUnavailable: boolean
  } | null>(null)

  async function handleSyncGroups() {
    setIsSyncingGroups(true)
    setFolderCount(null)
    setSyncResult(null)
    try {
      const result = await syncProjectGroups(projectId)
      const summary = {
        groups: result.acl?.groups ?? null,
        inserted: result.acl?.inserted ?? null,
        members: result.acl?.members ?? null,
        skipped: result.acl?.skipped ?? null,
        errors: result.acl?.errors.length ?? 0,
        aclUnavailable: result.acl == null,
      }
      const [folderAccessResult, foldersResult] = await Promise.allSettled([
        getProjectFolderAccess(projectId),
        getFolders(projectId),
      ])
      if (folderAccessResult.status === "fulfilled") {
        await mutate(folderAccessResult.value, false)
      } else {
        await mutate()
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
          : "Não foi possível sincronizar os grupos e membros da rede."
      )
    } finally {
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
                : "Grupos e membros sincronizados"}
            </DialogTitle>
            <DialogDescription>
              {syncResult?.aclUnavailable
                ? "A API não retornou o detalhamento da sincronização."
                : "Os dados do LDAP e da ACL foram atualizados no banco."}
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
                Membros sincronizados
              </span>
              <span className="font-semibold">
                {syncResult?.members ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Novos grupos nesta operação
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
                A leitura usa os dados do banco. Use Sincronizar para consultar
                a ACL e o LDAP e atualizar os registros.
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
            {isSyncingGroups
              ? "Sincronizando grupos e membros..."
              : "Sincronizar grupos e membros"}
          </Button>
        </div>

        {folderAccessError ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {folderAccessError instanceof Error
              ? folderAccessError.message
              : "Não foi possível carregar os acessos gravados no banco."}
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
                Última sincronização:{" "}
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
