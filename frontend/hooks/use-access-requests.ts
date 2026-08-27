"use client"

import useSWR from "swr"
import { getAccessRequests } from "@/lib/api-client"

export function useAccessRequests() {
  const { data, isLoading, error, mutate } = useSWR("access-requests", () => getAccessRequests())

  return {
    requests: data?.requests ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}
