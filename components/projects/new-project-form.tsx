"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ClipboardListIcon, Loader2Icon } from "lucide-react"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AccessGroupsEditor } from "@/components/projects/access-groups-editor"
import type { ProjectAccessGroupInput } from "@/lib/api-client"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCatalogs } from "@/hooks/use-catalogs"
import { createProject, ApiError, recordAuditEvent } from "@/lib/api-client"
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
  const [gestorProjeto, setGestorProjeto] = useState(currentUser.nome)
  const [gruposAcesso, setGruposAcesso] = useState<ProjectAccessGroupInput[]>(
    []
  )
  const [numeroTarefaSnow, setNumeroTarefaSnow] = useState("")
  const [pastaMae, setPastaMae] = useState("")
  const [descricao, setDescricao] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
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
        gruposAcesso,
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
      toast.success("Projeto criado com sucesso.")
      router.push(`/projetos/${project.id}`)
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
            <Field>
              <FieldLabel htmlFor="gestor">
                Responsável pela área de rede
              </FieldLabel>
              <Input
                id="gestor"
                value={gestorProjeto}
                onChange={(e) => setGestorProjeto(e.target.value)}
                placeholder="Informe o nome ou identificador do gestor"
              />
              <FieldDescription>
                Campo de texto para informar o responsável.
              </FieldDescription>
            </Field>
            <section
              className="flex flex-col gap-3 rounded-xl border border-border p-4"
              aria-labelledby="access-groups-heading"
            >
              <div>
                <h2
                  id="access-groups-heading"
                  className="text-base font-semibold"
                >
                  Grupos e papéis de acesso
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Opcional: você pode cadastrar a área sem grupos ou papéis e
                  configurar esses acessos depois. Nenhum membro precisa ser
                  vinculado durante a criação.
                </p>
              </div>
              <AccessGroupsEditor
                value={gruposAcesso}
                onChange={setGruposAcesso}
              />
            </section>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="snow">Número da tarefa do Snow</FieldLabel>
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
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            )}
            Criar área de rede
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
