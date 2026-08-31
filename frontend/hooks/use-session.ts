"use client"

import useSWR from "swr"
import { getSession } from "@/lib/api-client"

export function useSession() {
  const { data, error, isLoading, mutate } = useSWR("session", () => getSession(), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const rawUser = data?.user
  const user = rawUser
    ? {
        ...rawUser,
        nome: rawUser.nome || "Usuário corporativo",
        email: rawUser.email || "",
        cargo: rawUser.cargo || "",
        area: rawUser.area || "",
        avatarUrl: rawUser.avatarUrl || undefined,
        role: rawUser.role || "visualizador",
      }
    : null

  return {
    user,
    isLoading,
    error,
    refresh: mutate,
  }
}
