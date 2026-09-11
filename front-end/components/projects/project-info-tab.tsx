"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Building2Icon, CircleCheckIcon, ClipboardListIcon, Loader2Icon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateProject, ApiError } from "@/lib/api-client"
import type { Project, ProjectStatus } from "@/lib/types"

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "concluido", label: "Concluído" },
  { value: "suspenso", label: "Suspenso" },
]

export function ProjectInfoTab({
  project,
  canEdit,
  onUpdated,
}: {
  project: Project
  canEdit: boolean
  onUpdated: () => void
}) {
  const nome = project.nome
  const [areaResponsavel, setAreaResponsavel] = useState(project.areaResponsavel)
  const [descricao, setDescricao] = useState(project.descricao)
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [isSaving, setIsSaving] = useState(false)

  // O formulário precisa ser sincronizado quando o projeto selecionado muda.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAreaResponsavel(project.areaResponsavel)
    setDescricao(project.descricao)
    setStatus(project.status)
  }, [project])

  const dirty =
    areaResponsavel !== project.areaResponsavel ||
    descricao !== project.descricao ||
    status !== project.status

  async function handleSave() {
    setIsSaving(true)
    try {
      await updateProject(project.id, { nome, areaResponsavel, descricao, status })
      toast.success("Projeto atualizado.")
      onUpdated()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar as alterações."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const statusLabel = statusOptions.find((option) => option.value === status)?.label ?? status

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3" aria-label="Resumo do projeto">
        <div className="flex items-center gap-3 border-l-4 border-petrobras-green bg-petrobras-green/5 px-4 py-3">
          <CircleCheckIcon className="size-5 text-petrobras-green" aria-hidden="true" />
          <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status atual</p><p className="font-semibold text-foreground">{statusLabel}</p></div>
        </div>
        <div className="flex items-center gap-3 border-l-4 border-petrobras-blue bg-petrobras-blue/5 px-4 py-3">
          <Building2Icon className="size-5 text-petrobras-blue" aria-hidden="true" />
          <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Área responsável</p><p className="font-semibold text-foreground">{areaResponsavel || "Não informada"}</p></div>
        </div>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-petrobras-green">Projeto científico</p>
            <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-petrobras-green text-primary-foreground"><ClipboardListIcon className="size-6" aria-hidden="true" /></div><CardTitle className="text-2xl tracking-tight">{project.nome}</CardTitle></div>
            <CardDescription>
              {canEdit ? "Atualize os dados essenciais e o contexto deste projeto." : "Visão geral dos dados deste projeto."}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-petrobras-green/30 bg-petrobras-green/10 px-3 py-1.5 text-sm font-semibold text-petrobras-green">
            <span className="size-2 rounded-full bg-petrobras-green" aria-hidden="true" />
            {statusOptions.find((option) => option.value === status)?.label ?? status}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-5 py-6 sm:px-7">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.6fr)]">
          <Field>
            <FieldLabel htmlFor="nome">Nome do projeto</FieldLabel>
            <Input id="nome" value={nome} disabled className="h-11 bg-muted/50" />
          </Field>
          <Field>
            <FieldLabel htmlFor="id">Identificador</FieldLabel>
            <Input id="id" value={project.id} disabled className="h-11 font-mono text-muted-foreground" />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="area">Área responsável</FieldLabel>
            <Input id="area" value={areaResponsavel} onChange={(e) => setAreaResponsavel(e.target.value)} disabled={!canEdit} className="h-11" />
          </Field>
          <Field>
            <FieldLabel htmlFor="status">Status do projeto</FieldLabel>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)} disabled={!canEdit}>
              <SelectTrigger id="status" className="h-11 w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>{statusOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="descricao">Descrição e contexto</FieldLabel>
          <Textarea id="descricao" rows={6} value={descricao} onChange={(e) => setDescricao(e.target.value)} disabled={!canEdit} className="resize-y" />
          <FieldDescription className="flex flex-wrap gap-x-2 gap-y-1">
            <span>Criado em {new Date(project.criadoEm).toLocaleDateString("pt-BR")}</span>
            <span aria-hidden="true">·</span>

          </FieldDescription>
        </Field>
      </CardContent>
      {canEdit && (
        <CardFooter className="justify-end border-t bg-muted/20 pt-4">
          <Button onClick={handleSave} disabled={!dirty || isSaving}>
            {isSaving && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
            Salvar alterações
          </Button>
        </CardFooter>
      )}
      </Card>
    </div>
  )
}
