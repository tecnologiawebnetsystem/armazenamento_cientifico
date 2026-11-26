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
  getProjectMembers,
  recordAuditEvent,
  syncFolders,
  syncProjectGroups,
} from "@/lib/api-client"
import type { SessionUser } from "@/lib/types"

export function NewProjectForm({ currentUser }: { currentUser: SessionUser }) {
  const router = useRouter()
  const { areas, isLoading: areasLoading } = useCatalogs()
  const [nome, setNome] = useState("")
  const [codigo, setCodigo] = useState("")
  const [criadoEm, setCriadoEm] = useState(
    new Date().toISOString().slice(0, 10)
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
  const [syncSummary, setSyncSummary] = useState<{
    projectId: string
    projectName: string
    folders: number
    foldersInserted: number
    groups: number
    groupsInserted: number
    members: number
    aclErrors: number
    error?: string
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
      setIsSyncingNetwork(true)
      let folderCount = 0
      let foldersInserted = 0
      let groupCount = 0
      let groupsInserted = 0
      let memberCount = 0
      let aclErrors = 0
      try {
        const folderResult = await syncFolders(project.id, [], "folders")
        folderCount = folderResult.folders.length
        foldersInserted = folderResult.inserted

        setSyncStep("groups")
        const groupResult = await syncProjectGroups(project.id)
        groupCount = groupResult.acl?.groups ?? 0
        groupsInserted = groupResult.acl?.inserted ?? 0
        aclErrors = groupResult.acl?.errors.length ?? 0

        setSyncStep("members")
        const memberResult = await getProjectMembers(project.id)
        memberCount = memberResult.members.length

        setSyncSummary({
          projectId: project.id,
          projectName: project.nome,
          folders: folderCount,
          foldersInserted,
          groups: groupCount,
          groupsInserted,
          members: memberCount,
          aclErrors,
        })
      } catch (syncError) {
        setSyncSummary({
          projectId: project.id,
          projectName: project.nome,
          folders: folderCount,
          foldersInserted,
          groups: groupCount,
          groupsInserted,
          members: memberCount,
          aclErrors,
          error:
            syncError instanceof ApiError
              ? syncError.message
              : syncError instanceof Error
                ? syncError.message
                : "Não foi possível concluir a sincronização.",
        })
      } finally {
        setIsSyncingNetwork(false)
      }
    } catch (err: unknown) {
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
                return (
                  <li
                    key={id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 transition-colors",
                      isCurrent
                        ? "border-petrobras-green/40 bg-petrobras-green/5"
                        : "border-border/70 bg-background",
                      !isCurrent && !isDone && "opacity-55"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        isDone
                          ? "bg-petrobras-green text-primary-foreground"
                          : isCurrent
                            ? "bg-petrobras-green/10 text-petrobras-green"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isDone ? (
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
                        {detail}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {isDone ? (
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
                syncSummary?.error
                  ? "bg-destructive/10 text-destructive"
                  : "bg-petrobras-green/10 text-petrobras-green"
              )}
            >
              {syncSummary?.error ? (
                <AlertTriangleIcon className="size-6" aria-hidden="true" />
              ) : (
                <CheckCircle2Icon className="size-6" aria-hidden="true" />
              )}
            </div>
            <DialogTitle>
              {syncSummary?.error
                ? "Área criada com sincronização pendente"
                : "Área de rede sincronizada"}
            </DialogTitle>
            <DialogDescription>
              {syncSummary?.error
                ? `A área ${syncSummary.projectName} foi criada, mas não foi possível concluir a sincronização.`
                : `A primeira leitura de ${syncSummary?.projectName} foi concluída.`}
            </DialogDescription>
          </DialogHeader>

          {syncSummary?.error && (
            <Alert variant="destructive">
              <AlertTriangleIcon aria-hidden="true" />
              <AlertDescription>{syncSummary.error}</AlertDescription>
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
                {syncSummary?.folders ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">
                {syncSummary?.foldersInserted ?? 0} novas
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
                {syncSummary?.groups ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">
                {syncSummary?.groupsInserted ?? 0} novos
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
                {syncSummary?.members ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">
                vinculados à área
              </span>
            </div>
          </div>

          {(syncSummary?.aclErrors ?? 0) > 0 && (
            <Alert>
              <AlertTriangleIcon aria-hidden="true" />
              <AlertDescription>
                Alguns grupos não puderam ser lidos. Você pode tentar novamente
                em Mapa de Acessos.
              </AlertDescription>
            </Alert>
          )}

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
