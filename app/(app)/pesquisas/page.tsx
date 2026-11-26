"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Folder,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AccessGroupCard } from "@/components/projects/access-group-card"
import { PetrobrasLoading } from "@/components/petrobras-loading"
import {
  ExportButton,
  ExportFieldsDialog,
  type ExportField,
} from "@/components/export-fields-dialog"
import { PageHeader, PageLayout } from "@/components/shared/page-layout"
import {
  getFolders,
  getInconsistencyReport,
  getProjectAccessMap,
  getProjects,
  recordAuditEvent,
  syncProjectGroups,
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
import type { FileNode, Project, ProjectAccessMapResponse } from "@/lib/types"

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
})

function formatDate(value?: string | null) {
  if (!value) return "Não informado"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Não informado"
    : dateFormat.format(date)
}

function accessLabel(value?: string | null) {
  const safeValue = value?.trim() || "Não informado"
  return (
    {
      leitura: "Leitura",
      escrita: "Escrita",
      editor: "Edição",
      gerente: "Gestão",
      admin: "Administrador",
    }[safeValue.toLowerCase()] ?? safeValue
  )
}

function downloadFile(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
    link.remove()
  }, 1000)
}

const accessMapExportFields: ExportField[] = [
  { key: "codigo", label: "Código" },
  { key: "projeto", label: "Projeto" },
  { key: "pasta", label: "Pasta" },
  { key: "grupos", label: "Grupos e permissões" },
  { key: "membros", label: "Membros e papéis" },
  { key: "projetoCodigo", label: "Código do projeto" },
  { key: "areaResponsavel", label: "Área (gerência) responsável" },
  { key: "responsaveis", label: "Responsável pela área de rede" },
  { key: "caminhoPasta", label: "Caminho da pasta" },
  { key: "grupo", label: "Grupo de acesso" },
  { key: "permissao", label: "Permissão" },
  { key: "membroEmail", label: "E-mail do membro" },
  { key: "fonte", label: "Fonte da consulta" },
  { key: "consultadoEm", label: "Consultado em" },
]

async function exportAccessMap(
  project: Project,
  folders: FileNode[],
  accessMap: ProjectAccessMapResponse | undefined,
  groups: ProjectAccessMapResponse["groups"],
  members: ProjectAccessMapResponse["members"],
  format: "txt" | "csv",
  fields: string[]
) {
  const labels = Object.fromEntries(
    accessMapExportFields.map((field) => [field.key, field.label])
  )
  const consultedAt = accessMap?.consultedAt
    ? formatDate(accessMap.consultedAt)
    : formatDate(new Date().toISOString())
  const rows: string[][] = []
  const addRow = (values: Record<string, string>) =>
    rows.push(fields.map((field) => values[field] ?? ""))
  const base = {
    codigo: project.codigo,
    projeto: project.nome,
    projetoCodigo: project.codigo,
    areaResponsavel: project.areaResponsavel,
    responsaveis:
      accessMap?.project?.responsaveis?.join(", ") || "Não informado",
    fonte: accessMap?.source || "Mapa de acessos",
    consultadoEm: consultedAt,
  }

  folders.forEach((folder) =>
    addRow({
      ...base,
      pasta: folder.nome,
      caminhoPasta: folder.parentId
        ? `${project.pastaMae || "Pasta mãe"} / ${folder.parentId}`
        : project.pastaMae || "Pasta do projeto",
      grupos: "",
      membros: "",
      grupo: "",
      permissao: "",
    })
  )
  groups.forEach((group) =>
    addRow({
      ...base,
      pasta: "",
      caminhoPasta: "",
      grupos: `${group.nome} (${accessLabel(group.nivel)})`,
      membros: "",
      grupo: group.nome,
      permissao: accessLabel(group.nivel),
    })
  )
  members.forEach((member) =>
    addRow({
      ...base,
      pasta: "",
      caminhoPasta: "",
      grupos: "",
      membros: `${member.user?.nome || member.user?.userId || member.userId || "Usuário"} (${accessLabel(member.papel)})`,
      grupo: "",
      permissao: accessLabel(member.papel),
      membroEmail: member.user?.email || "E-mail não informado",
    })
  )

  const header = fields.map((field) => labels[field] ?? field)
  const sectionLines = [
    `MAPA DE ACESSOS - ${project.nome}`,
    `Código: ${project.codigo}`,
    `Gerado em: ${formatDate(new Date().toISOString())}`,
    "",
    "PASTAS E PERMISSÕES",
    `Total de pastas: ${folders.length}`,
    "GRUPOS DE ACESSO",
    `Total de grupos: ${groups.length}`,
    "MEMBROS AUTORIZADOS",
    `Total de membros: ${members.length}`,
    "PASTAS DA ÁREA DE REDE",
    `Caminho raiz: ${project.pastaMae || "Não informado"}`,
    "",
  ]
  const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`
  const csvLines = [
    ...sectionLines.slice(0, 3),
    "",
    header.map(escapeCsv).join(";"),
    ...rows.map((row) => row.map(escapeCsv).join(";")),
  ]
  const content =
    format === "csv"
      ? csvLines.join("\n")
      : [
          ...sectionLines,
          header.join(" | "),
          ...rows.map((row) => row.join(" | ")),
        ].join("\n")
  downloadFile(
    `\ufeff${content}`,
    `mapa-acessos-${project.codigo}.${format}`,
    format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8"
  )
  await recordAuditEvent({
    action: "exportar-relatorio",
    entity: "mapa_acessos",
    entity_id: project.id,
    details: {
      projeto: project.nome,
      codigo: project.codigo,
      formato: format,
      campos: fields,
      pastas: folders.length,
      grupos: groups.length,
      membros: members.length,
    },
  }).catch(() => undefined)
}

export default function AccessMapPage() {
  const [search, setSearch] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useSWR("access-map-projects", () => getProjects({ limit: 100 }))
  const projects = useMemo(
    () => projectsData?.projects ?? [],
    [projectsData?.projects]
  )
  const { data: inconsistencyData } = useSWR(
    "access-map-inconsistencies",
    () => getInconsistencyReport(),
    { revalidateOnFocus: false }
  )
  const inconsistentProjectIds = useMemo(
    () =>
      new Set(
        (inconsistencyData?.inconsistencias ?? [])
          .map((item) => item.projetoId)
          .filter(Boolean)
      ),
    [inconsistencyData]
  )
  const filteredProjects = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR")
    return projects.filter((project) => {
      const searchableText =
        `${project.nome} ${project.codigo} ${project.areaResponsavel} ${project.responsaveis?.join(" ") ?? ""} ${project.gestoresIds?.join(" ") ?? ""}`.toLocaleLowerCase(
          "pt-BR"
        )
      return !term || searchableText.includes(term)
    })
  }, [projects, search])
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId
  )
  const {
    data: accessMap,
    isLoading: accessLoading,
    error: accessError,
    mutate: retryAccess,
  } = useSWR<ProjectAccessMapResponse>(
    selectedProjectId ? ["project-access-map-page", selectedProjectId] : null,
    () => getProjectAccessMap(selectedProjectId)
  )
  const { data: foldersData, isLoading: foldersLoading } = useSWR(
    selectedProjectId ? ["access-map-folders", selectedProjectId] : null,
    () => getFolders(selectedProjectId)
  )
  const folders = (foldersData?.folders ?? [])
    .map((item) => {
      const raw = item as FileNode & {
        kind?: string
        name?: string
        project_id?: string
        parent_id?: string | null
      }
      return {
        ...item,
        id: raw.id,
        projectId: raw.projectId ?? raw.project_id ?? selectedProjectId,
        parentId: raw.parentId ?? raw.parent_id ?? null,
        tipo:
          (raw.tipo ?? raw.kind ?? "pasta") === "arquivo" ? "arquivo" : "pasta",
        nome: raw.nome ?? raw.name ?? "Pasta sem nome",
      } as FileNode
    })
    .filter((item) => item.tipo === "pasta")

  const selectProject = (project: Project) => {
    setSelectedProjectId(project.id)
    void recordAuditEvent({
      action: "consultar-mapa-acessos",
      entity: "projeto",
      entity_id: project.id,
      details: { projeto: project.nome, codigo: project.codigo },
    }).catch(() => undefined)
  }

  return (
    <PageLayout className="print-page-shell">
      <PageHeader
        eyebrow="Governança de acesso"
        title="Mapa de Acessos"
        description="Pesquise uma área de rede para consultar suas pastas, grupos e membros autorizados."
      />
      <div className="print-content-shell grid gap-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <Card className="sigac-surface h-fit overflow-hidden">
          <CardHeader className="sigac-section-header px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="size-4 text-primary" />
              Pesquisar área de rede
            </CardTitle>
            <CardDescription>
              Selecione uma área de rede para abrir o mapa de acessos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <Input
                aria-label="Pesquisar área de rede ou responsável"
                className="pl-9"
                placeholder="Nome, código, área ou responsável"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {projectsLoading ? (
              <PetrobrasLoading label="Carregando área de redes..." />
            ) : projectsError ? (
              <p className="text-sm text-destructive">
                Não foi possível carregar a área de rede.
              </p>
            ) : (
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {filteredProjects.map((project) => (
                  <button
                    type="button"
                    key={project.id}
                    onClick={() => selectProject(project)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${inconsistentProjectIds.has(project.id) ? "border-amber-300 bg-amber-50/80 text-foreground hover:bg-amber-100/70 dark:border-amber-700/80 dark:bg-amber-950/35 dark:hover:bg-amber-900/45" : selectedProjectId === project.id ? "border-primary bg-primary/10" : "border-border/70 hover:bg-muted/50"}`}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 truncate text-sm font-semibold">
                        <span
                          className={`size-2 shrink-0 rounded-full ${inconsistentProjectIds.has(project.id) ? "bg-amber-500" : "bg-primary"}`}
                        />
                        {project.nome}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {project.codigo}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
                {!filteredProjects.length ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma área de rede encontrada para os filtros informados.
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {!selectedProject ? (
          <Card className="sigac-surface flex min-h-[480px] items-center justify-center">
            <CardContent className="max-w-md space-y-3 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="size-7" />
              </div>
              <h2 className="text-xl font-semibold">
                Selecione uma área de rede
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Pesquise e selecione uma área de rede ao lado para visualizar as
                pastas, os grupos de identidade e os membros com acesso.
              </p>
            </CardContent>
          </Card>
        ) : (
          <AccessMapDetails
            project={selectedProject}
            inconsistent={inconsistentProjectIds.has(selectedProject.id)}
            accessMap={accessMap}
            accessError={accessError}
            accessLoading={accessLoading}
            folders={folders}
            foldersLoading={foldersLoading}
            retryAccess={retryAccess}
          />
        )}
      </div>
    </PageLayout>
  )
}

function AccessMapDetails({
  project,
  inconsistent,
  accessMap,
  accessError,
  accessLoading,
  folders,
  foldersLoading,
  retryAccess,
}: {
  project: Project
  inconsistent: boolean
  accessMap?: ProjectAccessMapResponse
  accessError?: Error
  accessLoading: boolean
  folders: FileNode[]
  foldersLoading: boolean
  retryAccess: () => void
}) {
  const groups = accessMap?.groups ?? []
  const members = accessMap?.members ?? []
  const [exportOpen, setExportOpen] = useState(false)
  const [isSyncingGroups, setIsSyncingGroups] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    groups: number
    inserted: number
    errors: number
  } | null>(null)
  const printMap = async (fields: string[]) => {
    await recordAuditEvent({
      action: "exportar-relatorio",
      entity: "mapa_acessos",
      entity_id: project.id,
      details: {
        projeto: project.nome,
        codigo: project.codigo,
        formato: "pdf",
        campos: fields,
        pastas: folders.length,
        grupos: groups.length,
        membros: members.length,
      },
    }).catch(() => undefined)
    window.setTimeout(() => window.print(), 150)
  }
  const handleSyncGroups = async () => {
    setIsSyncingGroups(true)
    try {
      const result = await syncProjectGroups(project.id)
      await retryAccess()
      setSyncResult({
        groups: result.acl?.groups ?? 0,
        inserted: result.acl?.inserted ?? 0,
        errors: result.acl?.errors.length ?? 0,
      })
    } catch (syncError) {
      toast.error(
        syncError instanceof Error
          ? syncError.message
          : "Não foi possível sincronizar os grupos da área de rede."
      )
    } finally {
      setIsSyncingGroups(false)
    }
  }

  return (
    <div className="print-access-map space-y-6">
      <Dialog
        open={syncResult !== null}
        onOpenChange={(open) => {
          if (!open) setSyncResult(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="size-6" aria-hidden="true" />
            </div>
            <DialogTitle>
              {syncResult?.errors
                ? "Sincronização concluída com alertas"
                : "Grupos sincronizados"}
            </DialogTitle>
            <DialogDescription>
              Confira o resumo da sincronização dos grupos da área de rede.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Total de grupos</span>
              <span className="font-semibold">{syncResult?.groups ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Grupos sincronizados
              </span>
              <span className="font-semibold text-primary">
                {syncResult?.groups ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Novos registros nesta operação
              </span>
              <span className="font-semibold">{syncResult?.inserted ?? 0}</span>
            </div>
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
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleSyncGroups()}
          disabled={isSyncingGroups || accessLoading}
          aria-busy={isSyncingGroups}
        >
          {isSyncingGroups ? (
            <Loader2
              className="animate-spin"
              data-icon="inline-start"
              aria-hidden="true"
            />
          ) : (
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
          )}
          {isSyncingGroups ? "Sincronizando grupos..." : "Sincronizar Grupos"}
        </Button>
        <ExportButton onClick={() => setExportOpen(true)} />
      </div>
      <ExportFieldsDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="mapa de acessos"
        fields={accessMapExportFields}
        onConfirm={(fields, formats) =>
          void Promise.all(
            formats.map(async (format) =>
              format === "pdf"
                ? printMap(fields)
                : exportAccessMap(
                    project,
                    folders,
                    accessMap,
                    groups,
                    members,
                    format,
                    fields
                  )
            )
          )
        }
      />
      <Card className="sigac-surface print-cover overflow-hidden">
        <CardHeader className="sigac-section-header px-5 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                Área de rede selecionada
              </p>
              <CardTitle className="mt-1 text-2xl">{project.nome}</CardTitle>
              <CardDescription className="mt-1">
                {project.codigo}
              </CardDescription>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Área (gerência) responsável
                  </p>
                  <p className="mt-1 font-medium">
                    {project.areaResponsavel || "Não informado"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Responsável pela área de rede
                  </p>
                  <p className="mt-1 font-medium">
                    {accessMap?.project?.responsaveis?.join(", ") ||
                      "Não informado"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Caminho da pasta mãe
                  </p>
                  <p className="mt-1 font-mono text-sm font-medium break-words">
                    {project.pastaMae || "Não informado"}
                  </p>
                </div>
              </div>
            </div>
            <Badge
              className={
                inconsistent
                  ? "border-amber-300 bg-amber-100 text-amber-800"
                  : ""
              }
              variant="secondary"
            >
              {inconsistent ? "Inconsistente" : project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Total de pastas</p>
            <p className="mt-1 text-2xl font-semibold">
              {foldersLoading ? "—" : folders.length}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Grupos</p>
            <p className="mt-1 text-2xl font-semibold">{groups.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Membros</p>
            <p className="mt-1 text-2xl font-semibold">
              {members.length ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="sigac-surface print-section print-folders">
        <CardHeader className="sigac-section-header px-5 py-4">
          <CardTitle className="text-base">Pastas e permissões</CardTitle>
          <CardDescription>
            Recursos da área de rede a partir da pasta mãe:{" "}
            <span className="font-mono text-xs">
              {project.pastaMae || "Não informado"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {foldersLoading ? (
            <div className="p-5">
              <PetrobrasLoading label="Carregando pastas..." />
            </div>
          ) : folders.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              Nenhuma pasta encontrada para este projeto.
            </p>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="grid gap-3 rounded-lg border border-border/70 bg-background/60 p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <FolderOpen className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-semibold break-words">{folder.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {folder.parentId
                          ? `Subpasta de ${folder.parentId}`
                          : "Pasta do projeto"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groups.map((group) => (
                      <Badge
                        key={`${folder.id}-${group.nome}`}
                        variant="outline"
                      >
                        {group.nome}: {accessLabel(group.nivel)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {accessLoading ? (
        <Card className="sigac-surface">
          <CardContent className="p-6">
            <PetrobrasLoading label="Consultando mapa de acessos..." />
          </CardContent>
        </Card>
      ) : accessError ? (
        <Card className="sigac-surface">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <ShieldCheck className="size-8 text-destructive" />
            <p className="font-semibold">
              Não foi possível consultar os acessos
            </p>
            <p className="text-sm text-muted-foreground">
              Verifique sua permissão para este projeto e tente novamente.
            </p>
            <Button variant="outline" onClick={retryAccess}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : accessMap ? (
        <>
          <Card className="sigac-surface print-section print-groups">
            <CardHeader className="sigac-section-header px-5 py-4">
              <CardTitle className="text-base">Grupos da integração</CardTitle>
              <CardDescription>
                Grupos recebidos da integração e níveis de acesso da área.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {groups.length === 0 ? (
                <p className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Nenhum grupo recebido da integração.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {groups.map((group) => (
                    <AccessGroupCard
                      key={`${group.fonte}-${group.nome}`}
                      group={group}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="sigac-surface print-section print-members">
            <CardHeader className="sigac-section-header px-5 py-4">
              <CardTitle className="text-base">Membros autorizados</CardTitle>
              <CardDescription>
                Pessoas com acesso à área de rede e seus níveis de permissão.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {members.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                  Nenhum membro autorizado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Permissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => {
                      const name =
                        member.user?.nome ||
                        member.user?.userId ||
                        member.userId ||
                        "Usuário"
                      const userId = member.user?.userId || member.userId

                      return (
                        <TableRow key={member.userId}>
                          <TableCell>
                            <p className="font-medium">{name}</p>
                            {userId && userId !== name && (
                              <p className="text-xs text-muted-foreground">
                                {userId}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="break-all">
                            {member.user?.email || "E-mail não informado"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {accessLabel(member.papel)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card className="sigac-surface">
            <CardHeader className="sigac-section-header px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="size-4 text-primary" />
                Pastas da área de rede
              </CardTitle>
              <CardDescription>
                Estrutura de pastas disponível dentro do escopo autorizado.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-3 px-5 py-4"
                  >
                    <Folder className="size-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{folder.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Pasta · atualizada em {formatDate(folder.atualizadoEm)}
                      </p>
                    </div>
                  </div>
                ))}
                {!folders.length ? (
                  <p className="p-5 text-sm text-muted-foreground">
                    Nenhuma pasta encontrada.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            Fonte: {accessMap.source} · Consultado em{" "}
            {formatDate(accessMap.consultedAt)}
          </p>
        </>
      ) : null}
    </div>
  )
}
