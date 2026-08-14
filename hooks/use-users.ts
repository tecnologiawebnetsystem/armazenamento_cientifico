"use client"

import useSWR from "swr"
import { getUsers } from "@/lib/api-client"

export function useUsers() {
  const { data, isLoading, error } = useSWR("users", () => getUsers())

  return {
    users: data?.users ?? [],
    isLoading,
    error,
  }
}
