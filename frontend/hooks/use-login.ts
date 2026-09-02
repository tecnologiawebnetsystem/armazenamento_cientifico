"use client"

import { useCallback, useState } from "react"
import { login } from "@/lib/api-client"

export type LoginMode = "email" | "corporate"

export function useLogin(nextPath = "/dashboard") {
  const [loading, setLoading] = useState<LoginMode | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const emailLogin = useCallback(async (email: string) => {
    setError(null)
    setLoading("email")
    try {
      await login(email)
      window.location.assign(nextPath)
    } catch {
      setError("Não foi possível validar seu acesso. Verifique os dados e tente novamente.")
      setLoading(null)
    }
  }, [nextPath])

  const corporateLogin = useCallback(() => {
    setError(null)
    setLoading("corporate")
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "")
    const callback = encodeURIComponent(nextPath)
    window.location.assign(`${apiBase}/api/auth/entra/login?next=${callback}`)
  }, [nextPath])

  return { loading, error, clearError, emailLogin, corporateLogin }
}
