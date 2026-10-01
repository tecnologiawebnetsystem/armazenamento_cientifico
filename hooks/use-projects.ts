"use client"

import useSWR from "swr"
import { getProjects } from "@/lib/api-client"

export function useProjects(params: { nome?: string; status?: string; area?: string; page?: number; limit?: number } = {}) {
  const key = ["projects", params.nome ?? "", params.status ?? "", params.area ?? "", params.page ?? 1, params.limit ?? 50]
  const { data, isLoading, error, mutate } = useSWR(key, () => getProjects(params), {
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  return {
    projects: data?.projects ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
    refresh: mutate,
  }
}
