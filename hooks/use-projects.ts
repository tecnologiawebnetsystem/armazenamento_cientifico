"use client"

import useSWR from "swr"
import { getProjects } from "@/lib/api-client"

export function useProjects() {
  const { data, isLoading, error, mutate } = useSWR("projects", () => getProjects())

  return {
    projects: data?.projects ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}
