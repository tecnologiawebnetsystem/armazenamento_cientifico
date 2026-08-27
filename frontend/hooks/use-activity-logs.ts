"use client"

import useSWR from "swr"
import { getActivityLogs } from "@/lib/api-client"

export type ActivityLogFilters = {
  q?: string
  usuario?: string
  projeto?: string
  acao?: string
  entidade?: string
  resultado?: string
  de?: string
  ate?: string
  page?: number
  limit?: number
}

export function useActivityLogs(filters: ActivityLogFilters = {}) {
  const key = ["activity-logs", filters]
  const { data, isLoading, isValidating, error, mutate } = useSWR(key, () => getActivityLogs(filters), { keepPreviousData: true })

  return {
    logs: data?.logs ?? [],
    pagination: data?.pagination ?? { page: filters.page ?? 1, limit: filters.limit ?? 10, total: 0, totalPages: 0 },
    isLoading,
    isValidating,
    error,
    refresh: mutate,
  }
}

export function activityLogQueryString(filters: ActivityLogFilters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value))
  })
  return params.toString()
}
