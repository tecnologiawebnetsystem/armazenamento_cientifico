"use client"

import { useCallback, useState } from "react"
import { login } from "@/lib/api-client"

export type LoginMode = "manual" | "corporate"

export function useLogin(nextPath = "/dashboard") {
  const [loading, setLoading] = useState<LoginMode | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const manualLogin = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError("Informe seu e-mail para continuar.")
      return
    }
    setError(null)
    setLoading("manual")
    try {
      await login(normalizedEmail)
      window.location.assign(nextPath)
    } catch (cause) {
      setLoading(null)
      setError(cause instanceof Error ? cause.message : "Não foi possível realizar o login por e-mail.")
    }
  }, [nextPath])

  const corporateLogin = useCallback(() => {
    setError(null)
    setLoading("corporate")

    const callback = encodeURIComponent(nextPath)
    const loginUrl = `/api/auth/cav4/start?next=${callback}`
    window.location.assign(loginUrl)
  }, [nextPath])

  return { loading, error, clearError, manualLogin, corporateLogin }
}
