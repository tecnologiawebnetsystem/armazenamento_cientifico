"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRightIcon } from "lucide-react"
import { navGroups } from "@/lib/nav-config"

const primaryPaths = new Set(["/dashboard", "/projetos", "/relatorios", "/logs", "/pesquisas", "/configuracoes"])

export function AppBreadcrumbs() {
  const pathname = usePathname()
  if (primaryPaths.has(pathname)) return null

  const current = navGroups.flatMap((group) => group.items.flatMap((item) => [item, ...(item.children ?? [])])).find((item) => pathname === item.url || pathname.startsWith(`${item.url}/`))
  const parent = pathname.startsWith("/projetos/") ? "Projetos" : current?.title
  if (!parent) return null

  return <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><Link href={pathname.startsWith("/projetos/") ? "/projetos" : "/dashboard"} className="truncate rounded-md px-1 py-1 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{parent}</Link>{current && current.title !== parent ? <><ChevronRightIcon className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate font-medium text-foreground">{current.title}</span></> : null}</nav>
}
