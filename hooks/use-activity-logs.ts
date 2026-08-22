"use client"

import useSWR from "swr"
import { getActivityLogs } from "@/lib/api-client"

export function useActivityLogs() {
  const { data, isLoading, error, mutate } = useSWR("activity-logs", () => getActivityLogs())

  return {
    logs: data?.logs ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}
