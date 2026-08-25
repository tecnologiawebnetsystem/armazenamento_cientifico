"use client"

import { usePathname } from "next/navigation"
import { ChevronRightIcon, ShieldCheckIcon } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function AppTopbar() {
  const pathname = usePathname()
  const { user } = useSession()
  const title = pageTitleFor(pathname)

  return (
    <header className="relative flex min-h-18 shrink-0 items-center gap-3 border-b border-border/70 bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden="true" />
      <SidebarTrigger className="size-9 rounded-xl border border-border/70 bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary" />
      <Separator orientation="vertical" className="mx-1 h-7 bg-border/70" />
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <span className="hidden font-medium sm:inline">Plataforma</span>
        <ChevronRightIcon className="hidden size-3.5 sm:inline" aria-hidden="true" />
        <h1 className="truncate text-sm font-bold tracking-tight text-foreground md:text-base">{title}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="hidden items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-[11px] font-medium text-primary lg:flex">
          <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
          Ambiente corporativo
        </div>
        <ThemeToggle />
        {user ? (
          <div className="flex items-center gap-2 border-l border-border/70 pl-2 md:pl-3">
            <Avatar className="size-9 rounded-xl ring-2 ring-primary/10">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.nome} /> : null}
              <AvatarFallback className="rounded-xl bg-primary text-[11px] font-bold text-primary-foreground">
                {initials(user.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 max-w-36 flex-col leading-tight md:flex">
              <span className="truncate text-xs font-semibold text-foreground">{user.nome}</span>
              <Badge variant="secondary" className="mt-1 w-fit border-0 bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                {roleLabel(user.role)}
              </Badge>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
