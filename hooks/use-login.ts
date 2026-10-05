"use client"

import { useCallback, useState } from "react"
import { login } from "@/lib/api-client"

export type LoginMode = "manual" | "corporate"

function getSafeNextPath(nextPath: string) {
  return nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard"
}

export function useLogin(nextPath = "/dashboard") {
  const safeNextPath = getSafeNextPath(nextPath)
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
      window.location.assign(safeNextPath)
    } catch (cause) {
      setLoading(null)
      setError(cause instanceof Error ? cause.message : "Não foi possível realizar o login por e-mail.")
    }
  }, [safeNextPath])

  const corporateLogin = useCallback(() => {
    setError(null)
    setLoading("corporate")

    const callback = encodeURIComponent(safeNextPath)
    const loginUrl = `/api/auth/cav4/start?next=${callback}`
    window.location.assign(loginUrl)
  }, [safeNextPath])

  return { loading, error, clearError, manualLogin, corporateLogin }
}
