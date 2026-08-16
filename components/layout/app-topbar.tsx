"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { navGroups } from "@/lib/nav-config"

function pageTitleFor(pathname: string) {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (pathname === item.url || pathname.startsWith(`${item.url}/`)) return item.title
    }
  }
  if (pathname.startsWith("/projetos/")) return "Detalhe do projeto"
  return "Armazenamento Científico"
}

export function AppTopbar() {
  const pathname = usePathname()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-sm font-medium text-foreground">{pageTitleFor(pathname)}</h1>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
          Ambiente local · dados de demonstração
        </Badge>
        <ThemeToggle />
      </div>
    </header>
  )
}
