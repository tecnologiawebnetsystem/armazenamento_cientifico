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
import { HelpWiki } from "@/components/help/help-wiki"

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
    <header className="relative flex min-h-16 shrink-0 items-center gap-2 overflow-hidden border-b border-border/80 bg-card/95 px-3 shadow-[0_8px_26px_color-mix(in_oklch,var(--foreground)_8%,transparent)] backdrop-blur-xl sm:gap-3 sm:px-4 md:min-h-18 md:px-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-petrobras-green via-petrobras-yellow to-petrobras-green" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_90%_40%,color-mix(in_oklch,var(--petrobras-yellow)_10%,transparent),transparent_65%)]" aria-hidden="true" />
      <SidebarTrigger className="relative size-10 rounded-xl border border-petrobras-green/25 bg-petrobras-green/10 text-petrobras-green shadow-sm transition-all hover:-translate-y-0.5 hover:border-petrobras-yellow/60 hover:bg-petrobras-yellow/10 hover:text-petrobras-yellow focus-visible:ring-2 focus-visible:ring-petrobras-yellow/70" />
      <Separator orientation="vertical" className="mx-1 h-8 bg-petrobras-green/25" />
      <div className="relative hidden items-center gap-2.5 sm:flex"><div className="rounded-xl bg-petrobras-green/10 p-1.5 ring-1 ring-petrobras-green/25 shadow-sm"><LogoMark className="size-7 shrink-0 rounded-md" /></div><div className="flex flex-col"><span className="text-xs font-bold tracking-[0.16em] text-petrobras-green">SIGAC</span><span className="text-[9px] font-medium tracking-[0.12em] text-muted-foreground uppercase">Governança de acesso</span></div></div>
      <div className="relative flex min-w-0 flex-1 flex-col gap-1 border-l border-border/70 pl-3 md:pl-5">
        <div className="hidden items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase md:flex"><span>Área de trabalho</span><span className="text-petrobras-yellow" aria-hidden="true">•</span><span className="text-petrobras-green">{pageTitle}</span></div>
        <div className="flex min-w-0 items-center gap-3"><AppBreadcrumbs /></div>
      </div>
      <Badge variant="outline" aria-label="Sessão protegida" title="Sessão protegida" className="relative hidden size-9 items-center justify-center rounded-xl border-petrobras-green/30 bg-petrobras-green/10 p-0 text-petrobras-green shadow-sm lg:inline-flex"><ShieldCheckIcon aria-hidden="true" className="size-4" /></Badge>
      <div className="relative flex items-center rounded-xl border border-petrobras-yellow/25 bg-petrobras-yellow/5 p-0.5 text-petrobras-yellow shadow-sm"><HelpWiki /></div>
      <div className="relative ml-auto flex items-center gap-2 rounded-2xl border border-border/70 bg-background/45 p-1.5 shadow-sm md:gap-2.5"><ThemeToggle />{isLoading ? <div className="size-9 animate-pulse rounded-xl bg-petrobras-green/10 ring-1 ring-petrobras-green/15" aria-label="Carregando perfil" /> : user ? <ProfileAvatarMenu user={user} onLogout={() => { router.push("/login"); router.refresh() }} /> : null}</div>
    </header>
  )
}
