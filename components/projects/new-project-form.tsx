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
  recordAuditEvent,
  syncFolders,
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
  const [syncSummary, setSyncSummary] = useState<{
    projectId: string
    projectName: string
    folders: number
    foldersInserted: number
    groups: number
    groupsInserted: number
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
      setIsSyncingNetwork(true)
      try {
        const result = await syncFolders(project.id, [], "all")
        setSyncSummary({
          projectId: project.id,
          projectName: project.nome,
          folders: result.folders.length,
          foldersInserted: result.inserted,
          groups: result.acl?.groups ?? 0,
          groupsInserted: result.acl?.inserted ?? 0,
          aclErrors: result.acl?.errors.length ?? 0,
        })
      } catch (syncError) {
        setSyncSummary({
          projectId: project.id,
          projectName: project.nome,
          folders: 0,
          foldersInserted: 0,
          groups: 0,
          groupsInserted: 0,
          aclErrors: 0,
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
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <div className="flex items-start gap-4">
            <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-petrobras-green/10 text-petrobras-green">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-petrobras-green/10" />
              <Loader2Icon
                className="relative size-6 animate-spin"
                aria-hidden="true"
              />
            </div>
            <DialogHeader className="gap-2">
              <DialogTitle className="text-lg">
                Atualizando a área de rede
              </DialogTitle>
              <DialogDescription className="leading-6">
                Estamos lendo a estrutura de{" "}
                <strong>{syncingProjectName}</strong> e sincronizando pastas e
                grupos de acesso. Avisaremos assim que estiver tudo pronto.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <span
                className="size-2 animate-pulse rounded-full bg-petrobras-green"
                aria-hidden="true"
              />
              Mapeando pastas e conferindo permissões
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              aria-hidden="true"
            >
              <div className="h-full w-2/3 animate-pulse rounded-full bg-petrobras-green" />
            </div>
            <p
              className="mt-3 text-xs leading-5 text-muted-foreground"
              aria-live="polite"
            >
              A primeira leitura pode levar alguns instantes. Mantenha esta tela
              aberta.
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
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderIcon className="size-4" aria-hidden="true" />
                Pastas sincronizadas
              </div>
              <span className="text-3xl font-semibold tracking-tight">
                {syncSummary?.folders ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">
                {syncSummary?.foldersInserted ?? 0} novas nesta operação
              </span>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersIcon className="size-4" aria-hidden="true" />
                Grupos sincronizados
              </div>
              <span className="text-3xl font-semibold tracking-tight">
                {syncSummary?.groups ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">
                {syncSummary?.groupsInserted ?? 0} novos nesta operação
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
