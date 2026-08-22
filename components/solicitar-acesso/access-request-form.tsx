"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Loader2Icon, SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getAllProjectsDirectory, createAccessRequest, ApiError } from "@/lib/api-client"
import { roleLabel } from "@/hooks/use-permissions"
import { useAccessRequests } from "@/hooks/use-access-requests"
import type { Role } from "@/lib/types"

const assignableRoles: Role[] = ["gestor", "participante", "visualizador"]

export function AccessRequestForm() {
  const { data } = useSWR("all-projects-directory", () => getAllProjectsDirectory())
  const { refresh } = useAccessRequests()

  const [projetoId, setProjetoId] = useState("")
  const [tipo, setTipo] = useState<"novo-acesso" | "alteracao-permissao">("novo-acesso")
  const [papelSolicitado, setPapelSolicitado] = useState<Role>("participante")
  const [justificativa, setJustificativa] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const projects = data?.projects ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!projetoId || !justificativa.trim()) return

    setIsSubmitting(true)
    try {
      const { request } = await createAccessRequest({ projetoId, tipo, papelSolicitado, justificativa })
      toast.success(`Solicitação enviada. Chamado ${request.numeroChamadoServiceNow} aberto para aprovação.`)
      refresh()
      setProjetoId("")
      setTipo("novo-acesso")
      setPapelSolicitado("participante")
      setJustificativa("")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível enviar a solicitação."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Nova solicitação</CardTitle>
          <CardDescription>Preencha os dados abaixo para abrir uma solicitação de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="projeto">Projeto</FieldLabel>
              <Select value={projetoId} onValueChange={(v) => setProjetoId(v ?? "")}>
                <SelectTrigger id="projeto" className="w-full">
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} · {p.areaResponsavel}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Tipo de solicitação</FieldLabel>
              <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)} className="gap-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="novo-acesso" id="tipo-novo" />
                  <FieldLabel htmlFor="tipo-novo" className="font-normal">
                    Novo acesso a um projeto que ainda não participo
                  </FieldLabel>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="alteracao-permissao" id="tipo-alteracao" />
                  <FieldLabel htmlFor="tipo-alteracao" className="font-normal">
                    Alteração de permissão em projeto que já participo
                  </FieldLabel>
                </div>
              </RadioGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="papel">Papel solicitado</FieldLabel>
              <Select value={papelSolicitado} onValueChange={(v) => setPapelSolicitado(v as Role)}>
                <SelectTrigger id="papel" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="justificativa">Justificativa</FieldLabel>
              <Textarea
                id="justificativa"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo da solicitação de acesso."
                rows={4}
                required
              />
              <FieldDescription>Esta justificativa será analisada pelo administrador responsável.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={!projetoId || !justificativa.trim() || isSubmitting}>
            {isSubmitting ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <SendIcon data-icon="inline-start" />
            )}
            Enviar solicitação
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
