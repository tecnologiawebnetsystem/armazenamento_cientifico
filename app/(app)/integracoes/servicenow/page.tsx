import type { Metadata } from "next"
import { ServiceNowPage } from "@/components/servicenow/servicenow-page"

export const metadata: Metadata = {
  title: "Integração ServiceNow | SIGAC",
  description: "Fila demonstrativa de RITMs pendentes e consulta do fluxo de atendimento do SIGAC.",
}

export default function ServiceNowRoute() {
  return <ServiceNowPage />
}
