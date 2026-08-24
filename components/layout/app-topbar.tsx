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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { logout } from "@/lib/api-client"
import { useRouter } from "next/navigation"

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
  const router = useRouter()
  const initials = user?.nome.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? ""

  async function handleLogout() {
    await logout()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="truncate text-sm font-semibold text-foreground">{pageTitleFor(pathname)}</h1>
        <span className="hidden text-[11px] text-muted-foreground sm:block">Centro de operações científicas</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Badge variant="outline" className="hidden border-warning/40 bg-warning/10 text-warning lg:inline-flex">
          {settings?.mensagemAvisoAmbiente ?? "Ambiente local · dados de demonstração"}
        </Badge>
        <ThemeToggle />
        {user ? (
          <div className="flex items-center gap-2 border-l border-border pl-3">
            <Avatar className="size-8">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.nome} /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 flex-col leading-tight xl:flex">
              <span className="max-w-32 truncate text-xs font-semibold">{user.nome}</span>
              <span className="text-[11px] text-muted-foreground">{roleLabel(user.role)}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>Sair</Button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
