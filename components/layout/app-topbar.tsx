"use client"

import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { ShieldCheckIcon } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSession } from "@/hooks/use-session"
import { ProfileAvatarMenu } from "@/components/layout/profile-avatar-menu"
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

export function AppTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useSession()
  const pageTitle = pageTitleFor(pathname)

  return (
    <header className="relative flex min-h-16 shrink-0 items-center gap-2 border-b border-border/70 bg-card/95 px-3 shadow-[0_10px_30px_color-mix(in_oklch,var(--petrobras-blue)_8%,transparent)] backdrop-blur-xl sm:gap-3 sm:px-4 md:min-h-18 md:px-6">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-petrobras-green via-petrobras-yellow to-petrobras-blue" aria-hidden="true" />
      <SidebarTrigger className="size-9 rounded-xl border border-petrobras-green/20 bg-petrobras-green/5 text-petrobras-blue shadow-sm transition-all hover:-translate-y-0.5 hover:border-petrobras-green/45 hover:bg-petrobras-green/10 hover:text-petrobras-green focus-visible:ring-2 focus-visible:ring-petrobras-yellow/70" />
      <Separator orientation="vertical" className="mx-1 h-7 bg-petrobras-green/20" />
      <div className="rounded-xl bg-petrobras-green/5 p-1 shadow-sm ring-1 ring-petrobras-green/15"><LogoMark className="size-8 shrink-0 rounded-lg" /></div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="hidden items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase sm:flex">
          <span>Governança de acesso</span>
          <span className="text-border" aria-hidden="true">/</span>
          <span className="text-petrobras-green">Ambiente corporativo</span>
        </div>
        <div className="flex min-w-0 items-center gap-3"><AppBreadcrumbs /><span className="hidden truncate text-sm font-semibold text-foreground md:inline">{pageTitle}</span></div>
      </div>
      <Badge variant="outline" className="hidden h-7 items-center gap-1.5 rounded-full border-petrobras-green/25 bg-petrobras-green/5 px-2.5 text-[10px] font-semibold text-petrobras-green lg:inline-flex"><ShieldCheckIcon aria-hidden="true" />Sessão protegida</Badge>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <ThemeToggle />
        {isLoading ? (
          <div className="size-9 animate-pulse rounded-xl bg-petrobras-green/10 ring-1 ring-petrobras-green/15" aria-label="Carregando perfil" />
        ) : user ? (
          <ProfileAvatarMenu user={user} onLogout={() => { router.push("/login"); router.refresh() }} />
        ) : null}
      </div>
    </header>
  )
}
