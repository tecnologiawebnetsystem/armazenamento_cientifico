"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import {
  ChevronDown,
  Clock3,
  Folder,
  FolderOpen,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  getProjectFolderAccess,
  getProjects,
  recordAuditEvent,
} from "@/lib/api-client"
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
  const [areaPickerOpen, setAreaPickerOpen] = useState(false)
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
  const {
    data: folderAccessData,
    isLoading: folderAccessLoading,
  } = useSWR(
    selectedProjectId ? ["access-map-folder-access", selectedProjectId] : null,
    () => getProjectFolderAccess(selectedProjectId),
    { revalidateOnFocus: false }
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
    setSearch("")
    setAreaPickerOpen(false)
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
      <div className="print-content-shell grid gap-6">
        <Card className="sigac-surface overflow-visible">
          <CardHeader className="sigac-section-header px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="size-4 text-primary" />
                  Pesquisar área de rede
                </CardTitle>
                <CardDescription className="mt-1">
                  Busque por nome, código, gerência ou responsável. O mapa será
                  exibido abaixo, ocupando toda a largura.
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {projectsLoading
                  ? "Carregando áreas…"
                  : `${projects.length} ${projects.length === 1 ? "área disponível" : "áreas disponíveis"}`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {projectsError ? (
              <p className="text-sm text-destructive" role="alert">
                Não foi possível carregar as áreas de rede. Tente atualizar a página.
              </p>
            ) : (
              <Popover open={areaPickerOpen} onOpenChange={setAreaPickerOpen}>
                <PopoverTrigger
                  render={<Button variant="outline" />}
                  disabled={projectsLoading}
                  aria-label={
                    selectedProject
                      ? `Área de rede selecionada: ${selectedProject.nome}, código ${selectedProject.codigo}. Clique para trocar.`
                      : "Selecionar área de rede para consultar acessos"
                  }
                  aria-expanded={areaPickerOpen}
                  className="h-auto min-h-12 w-full justify-start gap-3 px-3 py-2 text-left font-normal"
                >
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    {selectedProject ? (
                      <>
                        <span className="block truncate text-sm font-semibold">
                          {selectedProject.nome}
                        </span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {selectedProject.codigo}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {projectsLoading
                          ? "Carregando áreas de rede…"
                          : "Selecione ou pesquise uma área de rede"}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[min(44rem,calc(100vw-2rem))] gap-0 p-0"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      autoFocus
                      aria-label="Pesquisar área de rede ou responsável"
                      placeholder="Digite nome, código, gerência ou responsável…"
                      value={search}
                      onValueChange={setSearch}
                    />
                    <CommandList className="max-h-80">
                      <CommandEmpty>
                        Nenhuma área de rede encontrada. Tente outro termo.
                      </CommandEmpty>
                      <CommandGroup heading={`${filteredProjects.length} resultados`}>
                        {filteredProjects.map((project) => {
                          const inconsistent = inconsistentProjectIds.has(project.id)
                          return (
                            <CommandItem
                              key={project.id}
                              value={project.id}
                              onSelect={() => selectProject(project)}
                              className="min-h-14 py-2"
                            >
                              <span
                                className={`size-2 shrink-0 rounded-full ${inconsistent ? "bg-amber-500" : "bg-primary"}`}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">
                                  {project.nome}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {project.codigo} · {project.areaResponsavel || "Gerência não informada"}
                                  {project.responsaveis?.length
                                    ? ` · ${project.responsaveis.join(", ")}`
                                    : ""}
                                </span>
                              </span>
                              {inconsistent ? (
                                <Badge className="shrink-0 border-amber-300 bg-amber-100 text-amber-800">
                                  Inconsistente
                                </Badge>
                              ) : null}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </CardContent>
        </Card>

        {!selectedProject ? (
          <Card className="sigac-surface flex min-h-[320px] items-center justify-center">
            <CardContent className="max-w-md space-y-3 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="size-7" />
              </div>
              <h2 className="text-xl font-semibold">
                Selecione uma área de rede
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Use o campo acima para localizar uma área. As pastas, grupos e
                membros autorizados aparecerão aqui.
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
            folderAccessData={folderAccessData}
            folderAccessLoading={folderAccessLoading}
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
  folderAccessData,
  folderAccessLoading,
  folders,
  foldersLoading,
  retryAccess,
}: {
  project: Project
  inconsistent: boolean
  accessMap?: ProjectAccessMapResponse
  accessError?: Error
  accessLoading: boolean
  folderAccessData?: Awaited<ReturnType<typeof getProjectFolderAccess>>
  folderAccessLoading: boolean
  folders: FileNode[]
  foldersLoading: boolean
  retryAccess: () => void
}) {
  const groups = accessMap?.groups ?? []
  const members = accessMap?.members ?? []
  const visibleMembers = useMemo(() => {
    const byLogin = new Map<
      string,
      { userId: string; name: string; email: string; permissions: string[] }
    >()

    members.forEach((member) => {
      const userId = member.user?.userId || member.userId
      const key = userId.trim().toLocaleLowerCase("pt-BR")
      if (!key) return
      byLogin.set(key, {
        userId,
        name: member.user?.nome || userId,
        email: member.user?.email || "",
        permissions: member.papel ? [accessLabel(member.papel)] : [],
      })
    })

    ;(folderAccessData?.entries ?? []).forEach((entry) => {
      const entryMembers =
        entry.membros.length > 0
          ? entry.membros
          : entry.tipo !== "group"
            ? [{ login: entry.identificador || entry.grupo, nome: "", email: "" }]
            : []

      entryMembers.forEach((member) => {
        const userId = member.login.trim()
        const key = userId.toLocaleLowerCase("pt-BR")
        if (!key) return
        const existing = byLogin.get(key)
        const permission = accessLabel(entry.nivelRede || entry.nivelSigac)
        if (existing) {
          if (!existing.name || existing.name === existing.userId) {
            existing.name = member.nome || existing.name
          }
          if (!existing.email) existing.email = member.email
          if (!existing.permissions.includes(permission)) {
            existing.permissions.push(permission)
          }
        } else {
          byLogin.set(key, {
            userId,
            name: member.nome || userId,
            email: member.email,
            permissions: permission === "Não informado" ? [] : [permission],
          })
        }
      })
    })

    return Array.from(byLogin.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    )
  }, [members, folderAccessData])
  const [exportOpen, setExportOpen] = useState(false)
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
  return (
    <div className="print-access-map space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
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
          <div className="rounded-lg border border-petrobras-green/30 bg-petrobras-green/5 p-3">
            <p className="text-xs font-medium text-muted-foreground">Total de pastas</p>
            <p className="mt-1 text-2xl font-semibold text-petrobras-green">
              {foldersLoading ? "—" : folders.length}
            </p>
          </div>
          <div className="rounded-lg border border-petrobras-blue/25 bg-petrobras-blue/5 p-3">
            <p className="text-xs font-medium text-muted-foreground">Grupos</p>
            <p className="mt-1 text-2xl font-semibold text-petrobras-blue">{groups.length}</p>
          </div>
          <div className="rounded-lg border border-petrobras-yellow/50 bg-petrobras-yellow/10 p-3">
            <p className="text-xs font-medium text-muted-foreground">Membros</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {project.totalMembrosAcesso ?? 0}
            </p>
          </div>
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
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Membros autorizados</CardTitle>
                <Badge variant="secondary">
                  {folderAccessLoading && visibleMembers.length === 0
                    ? "Consultando…"
                    : `${visibleMembers.length} ${visibleMembers.length === 1 ? "membro" : "membros"}`}
                </Badge>
              </div>
              <CardDescription>
                Nome, chave corporativa e permissões identificadas na área de rede.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {visibleMembers.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground" aria-live="polite">
                  {folderAccessLoading
                    ? "Consultando membros e permissões da área de rede…"
                    : "Nenhum membro autorizado foi encontrado."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Permissões</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleMembers.map((member) => (
                      <TableRow key={member.userId}>
                        <TableCell className="min-w-48">
                          <p className="font-medium">{member.name}</p>
                          {member.userId !== member.name && (
                            <p className="break-all font-mono text-xs text-muted-foreground">
                              {member.userId}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="break-all">
                          {member.email || "E-mail não informado"}
                        </TableCell>
                        <TableCell>
                          {member.permissions.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {member.permissions.map((permission) => (
                                <Badge key={permission} variant="outline">
                                  {permission}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Não informado
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
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
