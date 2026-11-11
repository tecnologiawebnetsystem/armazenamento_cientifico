"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/use-permissions"
import { routeMatches } from "@/lib/role-access"

export function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { menus, permissions, role, isReady, error } = usePermissions()
  const hasServiceNowPermission = pathname === "/integracoes/servicenow" && (role === "admin" || permissions.includes("integracao-servicenow"))
  const isAuthorized = menus.some((menu) => routeMatches(pathname, menu.rota)) || hasServiceNowPermission
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
