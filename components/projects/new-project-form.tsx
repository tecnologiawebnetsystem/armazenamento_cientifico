"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CheckCircle2Icon,
  ClipboardListIcon,
  FolderOpenIcon,
  Loader2Icon,
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
import {
  createProject,
  ApiError,
  getProjectFolderAccess,
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
  const [syncingFolderName, setSyncingFolderName] = useState("")
  const [syncSummary, setSyncSummary] = useState<{
    projectId: string
    projectName: string
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
    setSyncingFolderName(pastaMae.trim())
    setIsSyncingNetwork(true)
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

      setSyncingFolderName(project.pastaMae || pastaMae.trim())

      await syncFolders(project.id, [], "folders").catch(() => undefined)
      await syncProjectGroups(project.id).catch(() => undefined)
      await getProjectFolderAccess(project.id).catch(() => undefined)

      setSyncSummary({
        projectId: project.id,
        projectName: project.nome,
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
          className="overflow-hidden rounded-2xl border-border/80 p-0 shadow-2xl sm:max-w-2xl"
          showCloseButton={false}
        >
          <div className="h-1.5 bg-gradient-to-r from-petrobras-green via-petrobras-green to-petrobras-yellow" />
          <div className="flex items-start gap-5 px-6 py-7 sm:gap-6 sm:px-8 sm:py-9">
            <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-petrobras-green/10 text-petrobras-green ring-1 ring-petrobras-green/15 sm:size-16">
              <FolderOpenIcon className="size-7" aria-hidden="true" />
              <span className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-petrobras-green text-primary-foreground shadow-sm">
                <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <DialogHeader className="gap-2 text-left">
                <span className="w-fit rounded-full bg-petrobras-green/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-petrobras-green">
                  Sincronização em andamento
                </span>
                <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Preparando sua área de rede
                </DialogTitle>
                <DialogDescription className="text-sm leading-6 sm:text-base">
                  Estamos sincronizando somente esta pasta. Assim que o processo terminar, a área ficará disponível para acesso.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 rounded-xl border border-border/70 bg-muted/35 p-3.5 sm:mt-6 sm:p-4">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Pasta em sincronização</p>
                <p className="break-all font-mono text-xs leading-5 text-foreground sm:text-sm">
                  {syncingFolderName || pastaMae.trim()}
                </p>
              </div>
              <div className="mt-5" role="progressbar" aria-label="Sincronizando pasta de rede" aria-valuetext="Em andamento">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <span className="sigac-sync-progress block h-full w-2/5 rounded-full bg-petrobras-green" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">Aguarde enquanto verificamos os arquivos e permissões.</p>
              </div>
            </div>
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
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <div className="flex size-12 items-center justify-center rounded-full bg-petrobras-green/10 text-petrobras-green">
              <CheckCircle2Icon className="size-6" aria-hidden="true" />
            </div>
            <DialogTitle>Área de rede criada com sucesso</DialogTitle>
            <DialogDescription>
              A área <strong>{syncSummary?.projectName}</strong> foi criada e
              está disponível.
            </DialogDescription>
          </DialogHeader>

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
