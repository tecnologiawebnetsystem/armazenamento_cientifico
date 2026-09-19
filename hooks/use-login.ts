"use client"

import { useCallback, useState } from "react"

export type LoginMode = "email" | "corporate"

/**
 * Extrai uma mensagem legível de uma resposta de erro do backend. O FastAPI
 * pode devolver `detail` como string ou como objeto `{ code, message }`.
 */
async function extractErrorMessage(response: Response): Promise<string | null> {
  try {
    const body = await response.json()
    const detail = body?.detail
    if (typeof detail === "string") return detail
    if (detail && typeof detail === "object") {
      return (detail.message as string) ?? (detail.code as string) ?? null
    }
    return null
  } catch {
    return null
  }
}

export function useLogin(nextPath = "/dashboard") {
  const [loading, setLoading] = useState<LoginMode | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const corporateLogin = useCallback(async () => {
    setError(null)
    setLoading("corporate")
    // Navegação relativa mantém o fluxo no proxy Next.js e evita CORS no navegador.
    const apiBase = process.env.NODE_ENV === "production"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      : ""
    const callback = encodeURIComponent(nextPath)
    const loginUrl = `${apiBase}/api/auth/cav4/start?next=${callback}`

    // Sonda o endpoint antes de navegar. Se o CAV4 estiver disponível ele
    // responde com um redirecionamento para o provedor corporativo; nesse caso
    // fazemos a navegação real. Se estiver indisponível/desabilitado, o backend
    // responde com erro (ex.: 503) e mostramos a mensagem dentro do formulário
    // em vez de deixar o navegador exibir a resposta de erro crua.
    try {
      const probe = await fetch(loginUrl, {
        method: "GET",
        credentials: "include",
        redirect: "manual",
      })

      const wantsRedirect = probe.type === "opaqueredirect" || probe.status === 0 || (probe.status >= 300 && probe.status < 400)
      if (wantsRedirect || probe.ok) {
        window.location.assign(loginUrl)
        return
      }

      const detail = await extractErrorMessage(probe)
      setError(detail ?? "Login corporativo indisponível no momento. Tente novamente ou use o login por e-mail.")
      setLoading(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o login corporativo")
      setLoading(null)
    }
  }, [nextPath])

  const emailLogin = useCallback(async (email: string) => {
    setError(null)
    setLoading("email")
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.detail ?? "Não foi possível entrar com este e-mail")
      }
      window.location.assign(nextPath)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no login por e-mail")
      setLoading(null)
    }
  }, [nextPath])

  return { loading, error, clearError, corporateLogin, emailLogin }
}
