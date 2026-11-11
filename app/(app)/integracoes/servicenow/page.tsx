import type { Metadata } from "next"
import { ServiceNowPage } from "@/components/servicenow/servicenow-page"

export const metadata: Metadata = {
  title: "Integração ServiceNow | SIGAC",
  description: "Consulta demonstrativa de RITMs e preparação do fluxo de acessos do SIGAC.",
}

export default function ServiceNowRoute() {
  return <ServiceNowPage />
}
