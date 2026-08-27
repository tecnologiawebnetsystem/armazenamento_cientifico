import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"
import { ActivityLogTable } from "@/components/administracao/activity-log-table"
import { BackButton } from "@/components/navigation/back-button"

export default async function LogsPage() {
  const user = findUserById(await getSessionUserId())
  if (!user) redirect("/login")
  if (user.role !== "admin" && user.role !== "auditor") redirect("/dashboard")
  return <main className="flex flex-col gap-6"><BackButton /><div><h1 className="text-2xl font-semibold tracking-tight">Logs e auditoria</h1><p className="text-sm text-muted-foreground">Consulte as operações realizadas na plataforma e exporte os registros.</p></div><ActivityLogTable /></main>
}
