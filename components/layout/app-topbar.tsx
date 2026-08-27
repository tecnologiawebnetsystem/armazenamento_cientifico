"use client"

import { usePathname } from "next/navigation"
import { LogOutIcon, ShieldCheckIcon, UserRoundIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout } from "@/lib/api-client"
import { useSession } from "@/hooks/use-session"
import { roleDescription, roleLabel } from "@/hooks/use-permissions"
import { navGroups } from "@/lib/nav-config"
import { AppBreadcrumbs } from "@/components/navigation/app-breadcrumbs"
import { LogoMark } from "@/components/brand/logo-mark"

function pageTitleFor(pathname: string) {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (pathname === item.url || pathname.startsWith(`${item.url}/`)) return item.title
    }
  }
  if (pathname.startsWith("/projetos/")) return "Detalhe do projeto"
  return "SIGAC"
}

function initials(name: string) {
  const safeName = name.trim()
  if (!safeName) return "US"

  return safeName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function AppTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useSession()
  const title = pageTitleFor(pathname)

  async function handleLogout() {
    await logout()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="relative flex min-h-16 shrink-0 items-center gap-2 border-b border-border/70 bg-background/95 px-3 backdrop-blur sm:gap-3 sm:px-4 md:min-h-18 md:px-6">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden="true" />
      <SidebarTrigger className="size-9 rounded-xl border border-border/70 bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary" />
      <Separator orientation="vertical" className="mx-1 h-7 bg-border/70" />
      <LogoMark className="size-9 shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-col gap-1"><AppBreadcrumbs /></div>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        
        <ThemeToggle />
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Abrir perfil de ${user.nome}`}
              className="flex items-center gap-2 rounded-xl border-l border-border/70 pl-2 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/40 md:pl-3"
            >
              <Avatar className="size-9 rounded-xl ring-2 ring-primary/10">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.nome} /> : null}
                <AvatarFallback className="rounded-xl bg-primary text-[11px] font-bold text-primary-foreground">
                  {initials(user.nome)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-36 truncate text-xs font-semibold text-foreground md:inline">{user.nome}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="flex flex-col gap-1 px-2 py-2" role="presentation">
                <span className="truncate text-sm font-semibold text-foreground">{user.nome}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                <span className="text-[11px] leading-4 text-muted-foreground">{roleDescription(user.role)}</span>
                <Badge variant="secondary" className="mt-1 w-fit border-0 bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                  {roleLabel(user.role) ?? "Usuário da plataforma"}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                <LogOutIcon />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  )
}
