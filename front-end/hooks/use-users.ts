"use client"

import { useCallback, useEffect, useState } from "react"
import { getUsers } from "@/lib/api-client"
import type { User } from "@/lib/types"

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getUsers()
      setUsers(result.users)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error("Não foi possível carregar os usuários."))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // A consulta inicial sincroniza o diretório com a API autenticada.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  return { users, isLoading, error, refresh }
}
