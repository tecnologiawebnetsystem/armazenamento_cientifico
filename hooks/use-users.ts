"use client"

import useSWR from "swr"
import { getUsers } from "@/lib/api-client"

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR("users", getUsers, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
  })

  return {
    users: data?.users ?? [],
    isLoading,
    error: error instanceof Error ? error : error ? new Error("Não foi possível carregar os usuários.") : null,
    refresh: mutate,
  }
}
