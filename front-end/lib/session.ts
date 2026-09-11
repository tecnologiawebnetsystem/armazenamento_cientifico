import { cookies } from "next/headers"
import type { SessionUser } from "@/lib/types"

/**
 * Compatibilidade para páginas server-side. A sessão de autenticação oficial
 * é mantida pelo cookie httpOnly emitido pelo backend FastAPI.
 */
const SESSION_COOKIE = "wayon_session_id"

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

export async function getBackendSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const sessionId = store.get(SESSION_COOKIE)?.value
  if (!sessionId) return null

  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "")
  const response = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Cookie: `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}` },
    cache: "no-store",
  })
  if (!response.ok) return null
  const payload = (await response.json()) as { user: SessionUser | null }
  return payload.user
}

export async function setSessionUserId(userId: string) {
  const store = await cookies()
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  })
}

export async function clearSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
