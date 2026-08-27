import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"

export default async function Page() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)

  redirect(user ? "/dashboard" : "/login")
}
