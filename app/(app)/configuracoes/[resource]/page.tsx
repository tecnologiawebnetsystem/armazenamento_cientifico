import { notFound } from "next/navigation"
import { ConfigurationPanel, configurationResourceLabels } from "@/components/configuration/configuration-panel"
import { PageHeader, PageSection } from "@/components/shared/page-layout"
import type { ConfigurationResource } from "@/lib/api-client"

export default async function ConfiguracaoResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  if (!(resource in configurationResourceLabels)) notFound()

  const config = configurationResourceLabels[resource as ConfigurationResource]
  return (
    <PageSection label="Configurações SIGAC" className="configuration-petrobras gap-5">
      <PageHeader
        eyebrow={config.group}
        title={config.label}
        description={`Gerencie os registros de ${config.label.toLowerCase()} nesta página.`}
      />
      <ConfigurationPanel initialResource={resource as ConfigurationResource} />
    </PageSection>
  )
}
