"use client"

import useSWR from "swr"
import { getPlatformContext } from "@/lib/api-client"
import type { PlatformContext } from "@/lib/types"

export function usePlatformContext() {
  const swr = useSWR<PlatformContext>("platform-context", getPlatformContext, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
  })

  return {
    ...swr,
    permissions: swr.data?.permissions ?? [],
    menus: [...(swr.data?.menus ?? [])].sort((a, b) => a.ordem - b.ordem),
    modules: [...(swr.data?.modules ?? [])].sort((a, b) => a.ordem - b.ordem),
    isReady: Boolean(swr.data),
  }
}
