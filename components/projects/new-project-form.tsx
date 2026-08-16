"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUsers } from "@/hooks/use-users"
import { createProject, ApiError } from "@/lib/api-client"
import type { SessionUser } from "@/lib/types"

export function NewProjectForm({ currentUser }: { currentUser: SessionUser }) {
  const router = useRouter()
  const { users, isLoading: usersLoading } = useUsers()
  const [nome, setNome] = useState("")
  const [areaResponsavel, setAreaResponsavel] = useState("")
  const [gestorId, setGestorId] = useState(currentUser.role === "gestor" ? currentUser.id : "")
  const [descricao, setDescricao] = useState("")
  const [participantesIds, setParticipantesIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const gestores = users.filter((u) => u.role === "gestor" || u.role === "admin")
  const outrosUsuarios = users.filter((u) => u.id !== gestorId)

  function toggleParticipante(id: string) {
    setParticipantesIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !areaResponsavel.trim() || !gestorId) {
      toast.error("Preencha os campos obrigatórios.")
      return
    }

    setIsSubmitting(true)
    try {
      const { project } = await createProject({
        nome: nome.trim(),
        areaResponsavel: areaResponsavel.trim(),
        gestorId,
        descricao: descricao.trim(),
        participantesIds,
      })
      toast.success("Projeto criado com sucesso.")
      router.push(`/projetos/${project.id}`)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível criar o projeto."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Informações do projeto</CardTitle>
          <CardDescription>O identificador do projeto (ID) é gerado automaticamente ao salvar.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nome">Nome do projeto</FieldLabel>
              <Input
                id="nome"
                placeholder="Ex.: Caracterização de Reservatórios do Pré-Sal"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="area">Área responsável</FieldLabel>
              <Input
                id="area"
                placeholder="Ex.: CENPES - Exploração e Produção"
                value={areaResponsavel}
                onChange={(e) => setAreaResponsavel(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="gestor">Gestor responsável</FieldLabel>
              <Select value={gestorId} onValueChange={(v) => setGestorId(v ?? "")}>
                <SelectTrigger id="gestor" className="w-full">
                  <SelectValue placeholder={usersLoading ? "Carregando..." : "Selecione um gestor"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {gestores.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome} · {u.area}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>O gestor terá permissões completas de administração do projeto.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
              <Textarea
                id="descricao"
                placeholder="Descreva o objetivo e o escopo do projeto científico."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
              />
            </Field>

            <Field>
              <FieldLabel>Participantes iniciais</FieldLabel>
              <FieldDescription>
                Selecione os pesquisadores que farão parte do projeto. Você poderá gerenciar papéis depois, na aba
                Membros e Permissões.
              </FieldDescription>
              <ScrollArea className="h-56 rounded-lg border">
                <div className="flex flex-col gap-1 p-2">
                  {outrosUsuarios.map((u) => (
                    <FieldLabel key={u.id} className="font-normal">
                      <Field orientation="horizontal">
                        <Checkbox
                          checked={participantesIds.includes(u.id)}
                          onCheckedChange={() => toggleParticipante(u.id)}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm">{u.nome}</span>
                          <span className="text-xs text-muted-foreground">{u.cargo}</span>
                        </div>
                      </Field>
                    </FieldLabel>
                  ))}
                </div>
              </ScrollArea>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/projetos")}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
            Criar projeto
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
