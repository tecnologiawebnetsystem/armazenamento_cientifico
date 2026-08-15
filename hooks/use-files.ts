"use client"

import useSWR from "swr"
import { getFiles } from "@/lib/api-client"

export function useFiles(projectId: string, parentId: string | null) {
  const { data, isLoading, error, mutate } = useSWR(["files", projectId, parentId], () =>
    getFiles(projectId, parentId),
  )

  return {
    files: data?.files ?? [],
    breadcrumb: data?.breadcrumb ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}
