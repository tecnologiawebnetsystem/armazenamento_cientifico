"use client"

import useSWR from "swr"
import { getProject } from "@/lib/api-client"

export function useProject(id: string) {
  const { data, isLoading, error, mutate } = useSWR(["project", id], () => getProject(id))

  return {
    project: data?.project,
    isLoading,
    error,
    refresh: mutate,
  }
}
