"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { usePlatformContext } from "@/hooks/use-platform-context"

function routeMatches(pathname: string, route: string) {
  const normalizedRoute = route.replace(/\/$/, "") || "/"
  return pathname === normalizedRoute || pathname.startsWith(`${normalizedRoute}/`)
}

export function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { menus, isReady, error } = usePlatformContext()
  const isAuthorized = menus.some((menu) => routeMatches(pathname, menu.rota))
  const fallbackRoute = menus[0]?.rota ?? "/forbidden"

  useEffect(() => {
    if (!isReady || error || isAuthorized) return
    router.replace(fallbackRoute)
  }, [error, fallbackRoute, isAuthorized, isReady, router])

  if (error) {
    return <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6 text-foreground">Não foi possível confirmar suas permissões. Atualize a página para tentar novamente.</p>
  }

  if (!isReady || !isAuthorized) {
    return <p role="status" aria-live="polite" className="rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">Verificando seu acesso ao módulo…</p>
  }

  return children
}
