import { NextResponse } from "next/server"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"

export async function GET() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  return NextResponse.json({ user })
}
