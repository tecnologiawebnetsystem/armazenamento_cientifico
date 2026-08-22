"use client"

import useSWR from "swr"
import { getSession } from "@/lib/api-client"

export function useSession() {
  const { data, isLoading, mutate } = useSWR("session", () => getSession(), {
    revalidateOnFocus: false,
  })

  return {
    user: data?.user ?? null,
    isLoading,
    refresh: mutate,
  }
}
