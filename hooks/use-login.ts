"use client"

import { useCallback, useState } from "react"

export type LoginMode = "corporate"

function getSafeNextPath(nextPath: string) {
  return nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard"
}

export function useLogin(nextPath = "/dashboard") {
  const safeNextPath = getSafeNextPath(nextPath)
  const [loading, setLoading] = useState<LoginMode | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const corporateLogin = useCallback(async () => {
    setError(null)
    setLoading("corporate")

    const callback = encodeURIComponent(safeNextPath)
    const loginUrl = `/api/auth/cav4/start?next=${callback}`

    try {
      const healthResponse = await fetch("/api/health", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
      if (!healthResponse.ok) throw new Error("API indisponível")
      window.location.assign(loginUrl)
    } catch {
      setLoading(null)
      setError("Não foi possível conectar à API do SIGAC. Verifique se o backend está em execução e se BACKEND_INTERNAL_URL aponta para ele.")
    }
  }, [safeNextPath])

  return { loading, error, clearError, corporateLogin }
}
