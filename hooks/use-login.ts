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

    // A chamada ao K4/KV-4 acontece somente após a ação explícita do usuário.
    // Não fazemos sondagem, consulta de sessão ou validação durante a abertura
    // da página de login.
    const callback = encodeURIComponent(nextPath)
    const loginUrl = `/api/auth/cav4/start?next=${callback}`
    window.location.assign(loginUrl)
  }, [nextPath])

  return { loading, error, clearError, corporateLogin }
}
