"use client"

import useSWR from "swr"
import { getAllFolders } from "@/lib/api-client"

/** Busca todas as pastas do projeto — usado para montar o seletor de destino no diálogo de mover. */
export function useAllFolders(projectId: string, enabled: boolean) {
  const { data, isLoading } = useSWR(enabled ? ["all-folders", projectId] : null, () => getAllFolders(projectId))

  return {
    folders: data?.files ?? [],
    isLoading,
  }
}
