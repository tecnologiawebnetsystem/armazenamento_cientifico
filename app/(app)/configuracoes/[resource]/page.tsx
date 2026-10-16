import { notFound } from "next/navigation"
import { ConfigurationPanel, configurationResourceLabels } from "@/components/configuration/configuration-panel"
import { PageHeader, PageSection } from "@/components/shared/page-layout"
import type { ConfigurationResource } from "@/lib/api-client"

export default async function ConfiguracaoResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource: rawResource } = await params
  const normalizedResource = decodeURIComponent(rawResource).trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")
  const resourceAliases: Record<string, ConfigurationResource> = {
    menus: "menus",
    modulos: "modules",
    permissoes: "permissions",
    "permissoes_de_menu": "menu_permissions",
    perfis: "profiles",
    "permissoes_por_perfil": "profile_permissions",
    "modulos_por_perfil": "profile_modules",
    "status_de_projetos": "project_statuses",
    "areas_responsaveis": "responsible_areas",
    "tipos_de_relatorio": "report_types",
    "campos_de_relatorio": "report_fields",
    "cards_do_dashboard": "dashboard_cards",
  }
  const resource = resourceAliases[normalizedResource] ?? normalizedResource
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
