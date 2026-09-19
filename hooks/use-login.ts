"use client"

import { useCallback, useState } from "react"
export type LoginMode = "corporate"

export function useLogin(nextPath = "/dashboard") {
  const [loading, setLoading] = useState<LoginMode | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const corporateLogin = useCallback(() => {
    setError(null)
    setLoading("corporate")

    const callback = encodeURIComponent(nextPath)
    const loginUrl = `/api/auth/cav4/start?next=${callback}`
    window.location.assign(loginUrl)
  }, [nextPath])

  return { loading, error, clearError, corporateLogin }
}
