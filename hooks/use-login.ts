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
    // Navegação relativa mantém o fluxo no proxy Next.js e evita CORS no navegador.
    const apiBase = process.env.NODE_ENV === "production"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "")
      : ""
    const callback = encodeURIComponent(nextPath)
    const loginUrl = `${apiBase}/api/auth/cav4/start?next=${callback}`
    console.info("[v0][CAV4] iniciando login corporativo", {
      environment: process.env.NODE_ENV,
      endpoint: loginUrl,
      nextPath,
    })
    window.location.assign(loginUrl)
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
