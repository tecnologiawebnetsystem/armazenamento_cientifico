"use client"

import useSWR from "swr"
import { getProjectMembers } from "@/lib/api-client"

export function useProjectMembers(projectId: string) {
  const { data, isLoading, error, mutate } = useSWR(["project-members", projectId], () =>
    getProjectMembers(projectId),
  )

  return {
    members: data?.members ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}
