"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSettings } from "@/hooks/use-settings"
import { useSession } from "@/hooks/use-session"
import { roleLabel } from "@/hooks/use-permissions"
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
  const { settings } = useSettings()
  const { user } = useSession()

  return (
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="truncate text-sm font-semibold text-foreground">{pageTitleFor(pathname)}</h1>
        <span className="hidden text-[11px] text-muted-foreground sm:block">Centro de operações científicas</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="hidden max-w-56 truncate border-warning/40 bg-warning/10 text-[11px] text-warning lg:inline-flex">
          {settings?.mensagemAvisoAmbiente ?? "Ambiente local · dados de demonstração"}
        </Badge>
        <ThemeToggle />
        {user ? (
          <Badge variant="secondary" className="hidden border-l border-border text-[11px] font-medium md:inline-flex">
            {roleLabel(user.role)}
          </Badge>
        ) : null}
      </div>
    </header>
  )
}
