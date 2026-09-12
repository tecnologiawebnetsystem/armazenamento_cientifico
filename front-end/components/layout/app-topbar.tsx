"use client"

import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
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
  pageTitleFor(pathname)

  return (
    <header className="relative flex min-h-16 shrink-0 items-center gap-2 border-b border-border/70 bg-card/90 px-3 shadow-[0_10px_30px_color-mix(in_oklch,var(--petrobras-blue)_10%,transparent)] backdrop-blur-xl sm:gap-3 sm:px-4 md:min-h-18 md:px-6">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden="true" />
      <SidebarTrigger className="size-9 rounded-xl border border-border/70 bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary" />
      <Separator orientation="vertical" className="mx-1 h-7 bg-border/70" />
      <LogoMark className="size-9 shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-col gap-1"><AppBreadcrumbs /></div>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <ThemeToggle />
        {isLoading ? (
          <div className="size-9 animate-pulse rounded-xl bg-muted" aria-label="Carregando perfil" />
        ) : user ? (
          <ProfileAvatarMenu user={user} onLogout={() => { router.push("/login"); router.refresh() }} />
        ) : null}
      </div>
    </header>
  )
}
