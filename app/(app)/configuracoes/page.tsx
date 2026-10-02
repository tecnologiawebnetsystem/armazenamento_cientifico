import { ConfigurationPanel } from "@/components/configuration/configuration-panel"
import { PageHeader, PageSection } from "@/components/shared/page-layout"

export default function ConfiguracoesPage() {
  return (
    <PageSection label="Configurações SIGAC" className="gap-5">
      <PageHeader
        eyebrow="Administração"
        title="Configurações"
        description="Gerencie perfis, permissões e parâmetros operacionais em um só lugar."
      />

      <ConfigurationPanel />
    </PageSection>
  )
}
