"use client"

import useSWR from "swr"
import { getCatalogs } from "@/lib/api-client"

export function useCatalogs() {
  const { data, error, isLoading, mutate } = useSWR("platform-catalogs", getCatalogs)
  return {
    catalogs: data,
    perfis: data?.perfis ?? [],
    modulos: data?.modulos ?? [],
    permissoes: data?.permissoes ?? [],
    statusProjetos: data?.statusProjetos ?? [],
    tiposProjetos: data?.tiposProjetos ?? [],
    tiposRelatorios: data?.tiposRelatorios ?? [],
    error,
    isLoading,
    refresh: mutate,
  }
}
