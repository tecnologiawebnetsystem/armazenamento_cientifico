"use client"

import useSWR from "swr"
import { getPlatformContext } from "@/lib/api-client"
import type { PlatformContext } from "@/lib/types"

export function usePlatformContext() {
  return useSWR<PlatformContext>("platform-context", getPlatformContext, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
}
