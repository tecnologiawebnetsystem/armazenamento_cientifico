import { redirect } from "next/navigation"
import { DashboardPageContent } from "@/components/dashboard/dashboard-page-content"
import { getBackendSession } from "@/lib/session"
import { isOperatorRole } from "@/lib/role-access"

export default async function DashboardPage() {
  const user = await getBackendSession()
  if (isOperatorRole(user?.role, user?.perfilId, user?.perfilNome)) {
    redirect("/configuracoes")
  }

  return <DashboardPageContent />
}
