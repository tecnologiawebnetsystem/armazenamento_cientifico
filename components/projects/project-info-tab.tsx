"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { updateProject, deleteProject, ApiError } from "@/lib/api-client"
import type { Project, ProjectStatus } from "@/lib/types"

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "concluido", label: "Concluído" },
  { value: "suspenso", label: "Suspenso" },
]

export function ProjectInfoTab({
  project,
  canEdit,
  canDelete,
  onUpdated,
}: {
  project: Project
  canEdit: boolean
  canDelete: boolean
  onUpdated: () => void
}) {
  const router = useRouter()
  const [nome, setNome] = useState(project.nome)
  const [areaResponsavel, setAreaResponsavel] = useState(project.areaResponsavel)
  const [descricao, setDescricao] = useState(project.descricao)
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setNome(project.nome)
    setAreaResponsavel(project.areaResponsavel)
    setDescricao(project.descricao)
    setStatus(project.status)
  }, [project])

  const dirty =
    nome !== project.nome ||
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

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteProject(project.id)
      toast.success("Projeto excluído.")
      router.push("/projetos")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível excluir o projeto."
      toast.error(message)
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do projeto</CardTitle>
        <CardDescription>
          {canEdit ? "Edite os dados do projeto científico." : "Dados do projeto científico."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="id">Identificador</FieldLabel>
            <Input id="id" value={project.id} disabled className="font-mono" />
          </Field>

          <Field>
            <FieldLabel htmlFor="nome">Nome do projeto</FieldLabel>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} disabled={!canEdit} />
          </Field>

          <Field>
            <FieldLabel htmlFor="area">Área responsável</FieldLabel>
            <Input
              id="area"
              value={areaResponsavel}
              onChange={(e) => setAreaResponsavel(e.target.value)}
              disabled={!canEdit}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)} disabled={!canEdit}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
            <Textarea
              id="descricao"
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={!canEdit}
            />
            <FieldDescription>
              Criado em {new Date(project.criadoEm).toLocaleDateString("pt-BR")} · Atualizado em{" "}
              {new Date(project.atualizadoEm).toLocaleDateString("pt-BR")}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
      {canEdit && (
        <CardFooter className="justify-between border-t pt-4">
          {canDelete ? (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" />}>
                <Trash2Icon data-icon="inline-start" />
                Excluir projeto
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir este projeto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação remove permanentemente o projeto, seus membros e arquivos associados. Não pode ser
                    desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <Button onClick={handleSave} disabled={!dirty || isSaving}>
            {isSaving && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
            Salvar alterações
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
