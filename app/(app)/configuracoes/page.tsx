import { ConfigurationPanel } from "@/components/configuration/configuration-panel"
import { PageHeader, PageSection } from "@/components/shared/page-layout"

export default function ConfiguracoesPage() {
  return (
    <PageSection label="Configurações SIGAC" className="gap-8">
      <PageHeader
        eyebrow="Administração"
        title="Configurações"
        description="Centralize preferências, segurança e parâmetros operacionais em um único espaço."
      />

      <ConfigurationPanel />
    </PageSection>
  )
}
