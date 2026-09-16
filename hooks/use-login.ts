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
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "")
    const callback = encodeURIComponent(nextPath)
    window.location.assign(`${apiBase}/api/auth/cav4/start?next=${callback}`)
  }, [nextPath])

  return { loading, error, clearError, corporateLogin }
}
