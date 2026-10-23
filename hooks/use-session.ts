"use client"

import useSWR from "swr"
import { getSession } from "@/lib/api-client"

export function useSession() {
  const { data, error, isLoading, mutate } = useSWR("/api/auth/session", getSession, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const rawUser = data?.user
  const avatarUrl = rawUser?.avatarUrl
    ? rawUser.avatarUrl.startsWith("/") && process.env.NEXT_PUBLIC_API_BASE_URL
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")}${rawUser.avatarUrl}`
      : rawUser.avatarUrl
    : undefined
  const user = rawUser
    ? {
        ...rawUser,
        nome: rawUser.nome || "Usuário corporativo",
        email: rawUser.email || "",
        cargo: rawUser.cargo || "",
        area: rawUser.area || "",
        avatarUrl,
        ultimoLogin: rawUser.ultimoLogin || null,
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
