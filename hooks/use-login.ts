"use client"

import { useCallback, useState } from "react"

export type LoginMode = "email" | "corporate"

export function useLogin(nextPath = "/dashboard") {
  const [loading, setLoading] = useState<LoginMode | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const corporateLogin = useCallback(() => {
    setError(null)
    setLoading("corporate")

    // A chamada ao K4/KV-4 acontece somente após a ação explícita do usuário.
    // Não fazemos sondagem, consulta de sessão ou validação durante a abertura
    // da página de login.
    const callback = encodeURIComponent(nextPath)
    const loginUrl = `/api/auth/cav4/start?next=${callback}`
    window.location.assign(loginUrl)
  }, [nextPath])

  const emailLogin = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError("Informe seu e-mail para continuar")
      return
    }

    setError(null)
    setLoading("email")
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const detail = typeof body?.detail === "string" ? body.detail : body?.detail?.message
        throw new Error(detail ?? "Não foi possível entrar com este e-mail")
      }

      const sessionResponse = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      })
      if (!sessionResponse.ok) {
        throw new Error("Login concluído, mas a sessão não foi reconhecida. Verifique o cookie e reinicie o backend.")
      }

      window.location.replace(nextPath)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no login por e-mail")
      setLoading(null)
    }
  }, [nextPath])

  return { loading, error, clearError, corporateLogin, emailLogin }
}
