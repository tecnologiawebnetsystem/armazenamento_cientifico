import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { ConfigurationPanel } from "@/components/configuration/configuration-panel"
import { PageHeader, PageSection } from "@/components/shared/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ConfiguracoesPage() {
  return (
    <PageSection label="Configurações SIGAC" className="gap-8">
      <PageHeader
        eyebrow="Administração"
        title="Configurações"
        description="Centralize preferências, segurança e parâmetros operacionais em um único espaço."
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-medium">Precisa revisar alterações?</p><p className="text-sm text-muted-foreground">Consulte o histórico de atividades para acompanhar mudanças administrativas.</p></div>
          <Link href="/logs" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Ver histórico <ArrowRightIcon aria-hidden /></Link>
        </CardContent>
      </Card>

      <ConfigurationPanel />
    </PageSection>
  )
}
