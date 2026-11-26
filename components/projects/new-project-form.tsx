"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  FolderIcon,
  Loader2Icon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ResponsibleUserAutocomplete } from "@/components/projects/responsible-user-autocomplete"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCatalogs } from "@/hooks/use-catalogs"
import { cn } from "@/lib/utils"
import {
  createProject,
  ApiError,
  getFolders,
  getProjectFolderAccess,
  recordAuditEvent,
  syncFolders,
  syncProjectGroups,
} from "@/lib/api-client"
import type { SessionUser } from "@/lib/types"

function getSyncFailureMessage(error: unknown) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : ""

  if (!message || /internal server error/i.test(message)) {
    return "Não sincronizado: o serviço retornou um erro interno."
  }

  return `Não sincronizado: ${message}`
}

export function NewProjectForm({ currentUser }: { currentUser: SessionUser }) {
  const router = useRouter()
  const { areas, isLoading: areasLoading } = useCatalogs()
  const [nome, setNome] = useState("")
  const [codigo, setCodigo] = useState("")
  const [criadoEm, setCriadoEm] = useState(
    () => new Date().toISOString().slice(0, 10)
  )
  const [areaResponsavel, setAreaResponsavel] = useState("")
  const [gestorProjeto, setGestorProjeto] = useState(
    currentUser.chaveCav4 ?? currentUser.userId ?? ""
  )
  const [numeroTarefaSnow, setNumeroTarefaSnow] = useState("")
  const [pastaMae, setPastaMae] = useState("")
  const [descricao, setDescricao] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncingNetwork, setIsSyncingNetwork] = useState(false)
  const [syncingProjectName, setSyncingProjectName] = useState("")
  const [syncStep, setSyncStep] = useState<"folders" | "groups" | "members">(
    "folders"
  )
  const [syncStepErrors, setSyncStepErrors] = useState<string[]>([])
  const [syncSummary, setSyncSummary] = useState<{
    projectId: string
    projectName: string
    folders: number | null
    foldersInserted: number | null
    groups: number | null
    groupsInserted: number | null
    members: number | null
    errors: Array<{ item: string; message: string }>
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (
      !nome.trim() ||
      !areaResponsavel.trim() ||
      !gestorProjeto.trim() ||
      !pastaMae.trim()
    ) {
      toast.error(
        "Preencha os campos obrigatórios, incluindo ao menos um gestor."
      )
      return
    }
    setIsSubmitting(true)
    try {
      const { project } = (await createProject({
        nome: nome.trim(),
        codigo: codigo || undefined,
        criadoEm,
        areaResponsavel: areaResponsavel.trim(),
        gestoresIds: [gestorProjeto.trim()],
        numeroTarefaSnow: numeroTarefaSnow.trim(),
        pastaMae: pastaMae.trim(),
        descricao: descricao.trim(),
        participantesIds: [],
      })) as { project: import("@/lib/types").Project }
      void recordAuditEvent({
        action: "criar",
        entity: "projeto",
        entity_id: project.id,
        details: {
          projeto: project.nome,
          codigo: project.codigo,
          areaResponsavel: project.areaResponsavel,
        },
      }).catch(() => undefined)

      setSyncingProjectName(project.nome)
      setSyncStep("folders")
      setSyncStepErrors([])
      setIsSyncingNetwork(true)
      let folderCount: number | null = null
      let foldersInserted: number | null = null
      let groupCount: number | null = null
      let groupsInserted: number | null = null
      let memberCount: number | null = null
      const errors: Array<{ item: string; message: string }> = []

      try {
        const folderResult = await syncFolders(project.id, [], "folders")
        folderCount = folderResult.folders.length
        foldersInserted = folderResult.inserted
      } catch (error) {
        errors.push({ item: "Pastas", message: getSyncFailureMessage(error) })
        setSyncStepErrors((current) => [...current, "folders"])
      }

      setSyncStep("groups")
      try {
        const groupResult = await syncProjectGroups(project.id)
        groupCount = groupResult.acl?.groups ?? null
        groupsInserted = groupResult.acl?.inserted ?? null
        if (!groupResult.acl) {
          errors.push({
            item: "Groups / Roles",
            message: "A API não retornou o resultado da sincronização.",
          })
          setSyncStepErrors((current) => [...current, "groups"])
        } else if (groupResult.acl.errors.length > 0) {
          errors.push({
            item: "Groups / Roles",
            message: `Sincronização parcial: ${groupResult.acl.errors.join("; ")}`,
          })
          setSyncStepErrors((current) => [...current, "groups"])
        }
      } catch (error) {
        errors.push({
          item: "Groups / Roles",
          message: getSyncFailureMessage(error),
        })
        setSyncStepErrors((current) => [...current, "groups"])
      }

      setSyncStep("members")
      try {
        const folderAccess = await getProjectFolderAccess(project.id)
        groupCount = Math.max(
          groupCount ?? 0,
          folderAccess.entries.filter((entry) => entry.tipo === "group").length
        )
        memberCount = new Set(
          folderAccess.entries
            .flatMap((entry) => entry.membros)
            .map((member) => member.login.trim().toLocaleLowerCase())
            .filter(Boolean)
        ).size
      } catch (error) {
        errors.push({ item: "Membros", message: getSyncFailureMessage(error) })
        setSyncStepErrors((current) => [...current, "members"])
      }

      const [savedFoldersResult, savedAccessResult] = await Promise.allSettled([
        getFolders(project.id),
        getProjectFolderAccess(project.id),
      ])

      if (savedFoldersResult.status === "fulfilled") {
        folderCount = savedFoldersResult.value.folders.filter(
          (folder) => folder.tipo !== "arquivo"
        ).length
      } else {
        errors.push({
          item: "Pastas no banco",
          message: getSyncFailureMessage(savedFoldersResult.reason),
        })
      }

      if (savedAccessResult.status === "fulfilled") {
        const savedEntries = savedAccessResult.value.entries
        groupCount = savedEntries.filter((entry) => entry.tipo === "group").length
        memberCount = new Set(
          savedEntries
            .flatMap((entry) => entry.membros)
            .map((member) => member.login.trim().toLocaleLowerCase())
            .filter(Boolean)
        ).size
      } else {
        errors.push({
          item: "Grupos e membros no banco",
          message: getSyncFailureMessage(savedAccessResult.reason),
        })
      }

      setSyncSummary({
        projectId: project.id,
        projectName: project.nome,
        folders: folderCount,
        foldersInserted,
        groups: groupCount,
        groupsInserted,
        members: memberCount,
        errors,
      })
      setIsSyncingNetwork(false)
    } catch (err: unknown) {
      setIsSyncingNetwork(false)
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível criar o projeto."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={isSyncingNetwork} onOpenChange={() => undefined}>
        <DialogContent
          className="overflow-hidden p-0 sm:max-w-xl"
          showCloseButton={false}
        >
          <div className="bg-gradient-to-br from-petrobras-green/10 via-background to-petrobras-yellow/15 px-6 py-6 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-petrobras-green text-primary-foreground shadow-md shadow-petrobras-green/20">
                <Loader2Icon
                  className="size-6 animate-spin"
                  aria-hidden="true"
                />
              </div>
              <DialogHeader className="gap-2">
                <DialogTitle className="text-xl tracking-tight">
                  Preparando sua área de rede
                </DialogTitle>
                <DialogDescription className="leading-6">
                  Estamos organizando os acessos de{" "}
                  <strong>{syncingProjectName}</strong>. Isso pode levar alguns
                  instantes.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="px-6 pb-6 sm:px-8">
            <div className="mb-5 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Sincronização em andamento</span>
              <span>
                {syncStep === "folders"
                  ? "1"
                  : syncStep === "groups"
                    ? "2"
                    : "3"}{" "}
                de 3
              </span>
            </div>
            <div
              className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted"
              aria-hidden="true"
            >
              <div
                className={cn(
                  "h-full rounded-full bg-petrobras-green transition-all duration-500",
                  syncStep === "folders"
                    ? "w-1/3"
                    : syncStep === "groups"
                      ? "w-2/3"
                      : "w-full"
                )}
              />
            </div>
            <ol
              className="flex flex-col gap-3"
              aria-live="polite"
              aria-label="Etapas da sincronização"
            >
              {[
                {
                  id: "folders",
                  label: "Pastas",
                  detail: "Lendo e registrando a estrutura de diretórios",
                  Icon: FolderIcon,
                },
                {
                  id: "groups",
                  label: "Groups / Roles",
                  detail: "Atualizando grupos e permissões da área",
                  Icon: ShieldCheckIcon,
                },
                {
                  id: "members",
                  label: "Membros",
                  detail: "Conferindo os membros vinculados à área",
                  Icon: UsersIcon,
                },
              ].map(({ id, label, detail, Icon }, index) => {
                const currentIndex =
                  syncStep === "folders" ? 0 : syncStep === "groups" ? 1 : 2
                const isDone = index < currentIndex
                const isCurrent = index === currentIndex
                const hasFailed = syncStepErrors.includes(id)
                return (
                  <li
                    key={id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 transition-colors",
                      hasFailed
                        ? "border-destructive/40 bg-destructive/5"
                        : isCurrent
                          ? "border-petrobras-green/40 bg-petrobras-green/5"
                          : "border-border/70 bg-background",
                      !isCurrent && !isDone && "opacity-55"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        hasFailed
                          ? "bg-destructive/10 text-destructive"
                          : isDone
                            ? "bg-petrobras-green text-primary-foreground"
                            : isCurrent
                              ? "bg-petrobras-green/10 text-petrobras-green"
                              : "bg-muted text-muted-foreground"
                      )}
                    >
                      {hasFailed ? (
                        <AlertTriangleIcon
                          className="size-5"
                          aria-hidden="true"
                        />
                      ) : isDone ? (
                        <CheckCircle2Icon
                          className="size-5"
                          aria-hidden="true"
                        />
                      ) : isCurrent ? (
                        <Icon className="size-5" aria-hidden="true" />
                      ) : (
                        <span className="text-sm font-semibold">
                          {index + 1}
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-semibold">{label}</span>
                      <span className="text-xs leading-5 text-muted-foreground">
                        {hasFailed
                          ? "Não sincronizado; as outras etapas continuam."
                          : detail}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium",
                        hasFailed ? "text-destructive" : "text-muted-foreground"
                      )}
                    >
                      {hasFailed ? (
                        "Não sincronizado"
                      ) : isDone ? (
                        "Concluído"
                      ) : isCurrent ? (
                        <Loader2Icon
                          className="size-4 animate-spin text-petrobras-green"
                          aria-label="Em andamento"
                        />
                      ) : (
                        "Aguardando"
                      )}
                    </span>
                  </li>
                )
              })}
            </ol>
            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
              Mantenha esta janela aberta até a conclusão.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={syncSummary !== null}
        onOpenChange={(open) => {
          if (!open && syncSummary)
            router.push(`/projetos/${syncSummary.projectId}`)
        }}
      >
        <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
          <DialogHeader>
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-full",
                syncSummary?.errors.length
                  ? "bg-destructive/10 text-destructive"
                  : "bg-petrobras-green/10 text-petrobras-green"
              )}
            >
              {syncSummary?.errors.length ? (
                <AlertTriangleIcon className="size-6" aria-hidden="true" />
              ) : (
                <CheckCircle2Icon className="size-6" aria-hidden="true" />
              )}
            </div>
            <DialogTitle>
              {syncSummary?.errors.length
                ? "Área criada com itens não sincronizados"
                : "Área de rede sincronizada"}
            </DialogTitle>
            <DialogDescription>
              {syncSummary?.errors.length
                ? `A área ${syncSummary.projectName} foi criada. As etapas seguintes continuaram, mas alguns itens não foram sincronizados.`
                : `A primeira leitura de ${syncSummary?.projectName} foi concluída.`}
            </DialogDescription>
          </DialogHeader>

          {(syncSummary?.errors.length ?? 0) > 0 && (
            <Alert variant="destructive">
              <AlertTriangleIcon aria-hidden="true" />
              <AlertDescription>
                <ul className="flex flex-col gap-1">
                  {syncSummary?.errors.map(({ item, message }) => (
                    <li key={item}>
                      <strong>{item}:</strong> {message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-xl border border-petrobras-green/20 bg-petrobras-green/5 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderIcon
                  className="size-4 text-petrobras-green"
                  aria-hidden="true"
                />
                Pastas
              </div>
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {syncSummary?.folders ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {syncSummary?.foldersInserted === null ||
                syncSummary?.foldersInserted === undefined
                  ? "— novas"
                  : `${syncSummary.foldersInserted} novas`}
              </span>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-petrobras-green/20 bg-petrobras-green/5 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheckIcon
                  className="size-4 text-petrobras-green"
                  aria-hidden="true"
                />
                Groups / Roles
              </div>
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {syncSummary?.groups ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {syncSummary?.groupsInserted === null ||
                syncSummary?.groupsInserted === undefined
                  ? "— novos"
                  : `${syncSummary.groupsInserted} novos`}
              </span>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-petrobras-green/20 bg-petrobras-green/5 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersIcon
                  className="size-4 text-petrobras-green"
                  aria-hidden="true"
                />
                Membros
              </div>
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {syncSummary?.members ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                pessoas encontradas nos grupos da rede
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              className="w-full bg-petrobras-green text-primary-foreground hover:bg-petrobras-green/90 sm:w-auto"
              onClick={() =>
                syncSummary && router.push(`/projetos/${syncSummary.projectId}`)
              }
            >
              Abrir área de rede
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-5xl">
        <Card className="sigac-surface overflow-hidden">
          <CardHeader className="border-b-2 border-petrobras-yellow/70 bg-gradient-to-r from-petrobras-green/15 via-background to-petrobras-yellow/20 px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-petrobras-green text-primary-foreground shadow-md shadow-petrobras-green/25">
                <ClipboardListIcon className="size-6" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-xl tracking-tight text-petrobras-green sm:text-2xl">
                  Nova área de rede
                </CardTitle>
                <CardDescription className="mt-1">
                  Cadastre uma área de rede científica com governança, acesso e
                  armazenamento organizados.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-6 sm:px-8 sm:py-7">
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="nome">Área de Rede</FieldLabel>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Caracterização de Reservatórios"
                />
              </Field>
              <Field className="rounded-xl border border-petrobras-green/35 bg-gradient-to-br from-petrobras-green/10 to-petrobras-yellow/10 p-4 shadow-sm shadow-petrobras-green/10">
                <FieldLabel
                  htmlFor="area"
                  className="font-semibold text-petrobras-green"
                >
                  1. Área (gerência) responsável
                </FieldLabel>
                <Select
                  value={areaResponsavel}
                  onValueChange={(value) => {
                    const selected = areas.find((area) => area.nome === value)
                    setAreaResponsavel(value ?? "")
                    setCodigo(
                      selected?.proximoCodigo ??
                        `${selected?.prefixo ?? ""}-${String(selected?.next_number ?? 1).padStart(4, "0")}`
                    )
                  }}
                >
                  <SelectTrigger id="area" disabled={areasLoading}>
                    <SelectValue
                      placeholder={
                        areasLoading
                          ? "Carregando áreas..."
                          : "Selecione a área primeiro"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.nome}>
                          {area.nome} · {area.prefixo}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  O identificador é gerado automaticamente conforme a área
                  selecionada.
                </FieldDescription>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="codigo">
                    Código ou identificador único
                  </FieldLabel>
                  <Input
                    id="codigo"
                    value={codigo}
                    readOnly
                    placeholder="Selecione uma área"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="criadoEm">Data de criação</FieldLabel>
                  <Input
                    id="criadoEm"
                    type="date"
                    value={criadoEm}
                    onChange={(e) => setCriadoEm(e.target.value)}
                  />
                </Field>
              </div>
              <ResponsibleUserAutocomplete
                value={gestorProjeto}
                onChange={setGestorProjeto}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="snow">
                    Número da tarefa do Snow
                  </FieldLabel>
                  <Input
                    id="snow"
                    value={numeroTarefaSnow}
                    onChange={(e) => setNumeroTarefaSnow(e.target.value)}
                    placeholder="Ex.: TASK0041827"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pasta">
                    Nome da pasta mãe do projeto
                  </FieldLabel>
                  <Input
                    id="pasta"
                    value={pastaMae}
                    onChange={(e) => setPastaMae(e.target.value)}
                    placeholder="Ex.: presal-caracterizacao"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o objetivo e o escopo da área de rede."
                  rows={4}
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t border-petrobras-green/15 bg-petrobras-green/5 px-5 py-4 sm:px-8">
            <Button
              type="button"
              variant="outline"
              className="border-petrobras-green/30 text-petrobras-green hover:bg-petrobras-green/10"
              onClick={() => router.push("/projetos")}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-petrobras-green text-primary-foreground hover:bg-petrobras-green/90"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              Criar área de rede
            </Button>
          </CardFooter>
        </Card>
      </form>
    </>
  )
}
