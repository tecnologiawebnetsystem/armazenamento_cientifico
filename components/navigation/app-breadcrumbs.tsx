"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRightIcon, HomeIcon } from "lucide-react"
import { navGroups } from "@/lib/nav-config"

export function AppBreadcrumbs() {
  const pathname = usePathname()
  const current = [...navGroups.flatMap((group) => group.items)].find((item) => pathname === item.url || pathname.startsWith(`${item.url}/`))
  const segments = pathname.split("/").filter(Boolean)
  return <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground"><Link href="/dashboard" className="inline-flex items-center gap-1 hover:text-foreground"><HomeIcon className="size-3.5" aria-hidden="true" /><span className="sr-only">Início</span></Link>{segments.length ? <ChevronRightIcon className="size-3.5" aria-hidden="true" /> : null}<span className="font-medium text-foreground">{current?.title ?? (segments.at(-1) === "logs" ? "Logs de auditoria" : "Detalhe")}</span></nav>
}
