import { redirect } from "next/navigation"
import { getBackendSession } from "@/lib/session"

export default async function Page() {
  const user = await getBackendSession()
  redirect(user ? "/dashboard" : "/login")
}
