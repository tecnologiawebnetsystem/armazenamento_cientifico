"use client"

import useSWR from "swr"
import { getSettings } from "@/lib/api-client"

export function useSettings() {
  const { data, isLoading, error, mutate } = useSWR("settings", () => getSettings())

  return {
    settings: data?.settings,
    isLoading,
    error,
    refresh: mutate,
  }
}
