"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2Icon, SaveIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useSettings } from "@/hooks/use-settings"
import { updateSettings, ApiError } from "@/lib/api-client"

export function PlatformSettingsForm() {
  const { settings, isLoading, refresh } = useSettings()
  const [areas, setAreas] = useState("")
  const [cotaGb, setCotaGb] = useState("50")
  const [diasExpiracao, setDiasExpiracao] = useState("30")
  const [mensagemAviso, setMensagemAviso] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (settings && !hydrated) {
      setAreas(settings.areasOrganizacionais.join("\n"))
      setCotaGb(String(Math.round(settings.cotaArmazenamentoPadraoMb / 1024)))
      setDiasExpiracao(String(settings.diasExpiracaoSolicitacaoAcesso))
      setMensagemAviso(settings.mensagemAvisoAmbiente)
      setHydrated(true)
    }
  }, [settings, hydrated])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      await updateSettings({
        areasOrganizacionais: areas
          .split("\n")
          .map((a) => a.trim())
          .filter(Boolean),
        cotaArmazenamentoPadraoMb: Math.max(1, Number(cotaGb) || 0) * 1024,
        diasExpiracaoSolicitacaoAcesso: Math.max(1, Number(diasExpiracao) || 0),
        mensagemAvisoAmbiente: mensagemAviso,
      })
      toast.success("Parâmetros atualizados.")
      refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar os parâmetros."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !hydrated) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle>Parâmetros globais</CardTitle>
          <CardDescription>Estas configurações afetam toda a plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="areas">Áreas organizacionais</FieldLabel>
              <Textarea id="areas" value={areas} onChange={(e) => setAreas(e.target.value)} rows={6} />
              <FieldDescription>Uma área por linha. Usadas nos cadastros de projetos e usuários.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="cota">Cota de armazenamento padrão por projeto (GB)</FieldLabel>
              <Input
                id="cota"
                type="number"
                min={1}
                value={cotaGb}
                onChange={(e) => setCotaGb(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="expiracao">Expiração de solicitações de acesso (dias)</FieldLabel>
              <Input
                id="expiracao"
                type="number"
                min={1}
                value={diasExpiracao}
                onChange={(e) => setDiasExpiracao(e.target.value)}
              />
              <FieldDescription>
                Solicitações pendentes por mais tempo do que isso devem ser reavaliadas pelo administrador.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="aviso">Mensagem de aviso de ambiente</FieldLabel>
              <Input id="aviso" value={mensagemAviso} onChange={(e) => setMensagemAviso(e.target.value)} />
              <FieldDescription>Exibida como aviso fixo na barra superior da plataforma.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            Salvar parâmetros
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
