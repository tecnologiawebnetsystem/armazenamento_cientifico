import { cookies } from "next/headers"

/**
 * Sessão mock baseada em cookie httpOnly contendo o userId.
 *
 * Quando o backend em Python for implementado, esta camada deve ser
 * substituída por um esquema real (JWT/sessão no servidor), mas o contrato
 * `getSessionUserId` / `setSessionUserId` / `clearSession` pode ser mantido.
 */
const SESSION_COOKIE = "wayon_session_user_id"

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
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
