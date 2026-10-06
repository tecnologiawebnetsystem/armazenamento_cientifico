"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogoMark } from "@/components/brand/logo-mark"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { usePlatformContext } from "@/hooks/use-platform-context"
import { ChartNoAxesCombinedIcon, FolderKanbanIcon, LayoutDashboardIcon, NetworkIcon, SettingsIcon, ShieldCheckIcon, type LucideIcon } from "lucide-react"
import type { NavGroup, NavItem } from "@/lib/nav-config"
import { normalizeRole } from "@/hooks/use-permissions"
import type { PlatformMenu } from "@/lib/types"

const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboardIcon,
  folder: FolderKanbanIcon,
  projetos: FolderKanbanIcon,
  relatorio: ChartNoAxesCombinedIcon,
  relatorios: ChartNoAxesCombinedIcon,
  chart: ChartNoAxesCombinedIcon,
  auditoria: ShieldCheckIcon,
  logs: ShieldCheckIcon,
  shield: ShieldCheckIcon,
  network: NetworkIcon,
  pesquisas: NetworkIcon,
  settings: SettingsIcon,
}

function getIcon(name: string): LucideIcon {
  return iconMap[name.trim().toLowerCase()] ?? FolderKanbanIcon
}

function buildNavGroups(menus: PlatformMenu[], profileName?: string | null): NavGroup[] {
  const role = normalizeRole(profileName)
  const uniqueMenus = Array.from(
    new Map(
      menus
        .filter((menu) => menu.rota)
        .filter((menu) => {
          const route = menu.rota.trim().replace(/\/$/, "")
          const menuName = menu.nome.trim().toLowerCase()
          const isSettings = route === "/configuracoes" || menuName === "configurações"
          const isAuditorOnlyMenu = route === "/auditoria" || menuName === "logs e auditoria" || menuName === "auditoria"

          if (role === "auditor") {
            return isAuditorOnlyMenu
          }

          return !isSettings || role === "operador"
        })
        .map((menu) => [menu.rota.trim().replace(/\/$/, "") || "/", menu]),
    ).values(),
  )

  const items: NavItem[] = uniqueMenus.map((menu) => ({
    title: menu.rota.replace(/\/$/, "") === "/pesquisas" ? "Mapa de Acessos" : menu.nome,
    url: menu.rota,
    icon: getIcon(menu.icone),
  }))

  return items.length ? [{ label: "Sistema", items }] : []
}

export function AppSidebar() {
  const pathname = usePathname()
  const { menus, data } = usePlatformContext()
  const homeHref = menus[0]?.rota ?? "/forbidden"
  const profileName = data?.user?.perfil_nome

  const groups = buildNavGroups(menus, profileName)

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border/55 bg-sidebar shadow-[8px_0_28px_color-mix(in_oklch,var(--sidebar)_24%,transparent)] transition-[width] duration-200 md:flex">
      <SidebarHeader className="gap-0 p-0">
        <div className="h-1 w-full bg-gradient-to-r from-sidebar-primary via-petrobras-yellow to-sidebar-primary" />
        <SidebarMenu className="p-3">
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-3 pb-2 text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground/50 uppercase group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <span className="size-1.5 rounded-full bg-sidebar-primary shadow-[0_0_8px_var(--sidebar-primary)]" aria-hidden="true" />
              <span className="group-data-[collapsible=icon]:hidden">Ambiente corporativo</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico" render={<Link href={homeHref} />}>
              <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary/15 ring-1 ring-sidebar-primary/40 shadow-[0_0_20px_color-mix(in_oklch,var(--sidebar-primary)_18%,transparent)]"><LogoMark className="size-5" /></div>
              <div className="flex min-w-0 flex-col gap-1 leading-none group-data-[collapsible=icon]:hidden"><span className="truncate text-sm font-semibold tracking-wide">SIGAC</span><span className="hidden truncate text-[10px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">Gestão de acesso ao armazenamento científico</span></div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="mx-0" />
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1 py-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="border-b border-sidebar-border/30 px-2 py-3 last:border-b-0">
            <SidebarGroupLabel className="h-8 px-2 text-[10px] font-semibold tracking-[0.16em] text-sidebar-primary/80 uppercase group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`)
                  return (
                    <SidebarMenuItem key={item.url} className="relative">
                      {isActive ? <span aria-hidden className="absolute top-1/2 left-0 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-sidebar-primary shadow-[0_0_8px_color-mix(in_oklch,var(--sidebar-primary)_55%,transparent)] group-data-[collapsible=icon]:hidden" /> : null}
                      <SidebarMenuButton render={<Link href={item.url} />} isActive={isActive} tooltip={item.title} className="h-10 gap-3 rounded-lg px-3 text-[13px] font-medium text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/70 data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-foreground data-active:shadow-[inset_3px_0_0_var(--sidebar-primary)] [&_svg]:text-sidebar-foreground data-active:[&_svg]:text-sidebar-foreground">
                        <item.icon />
                        <span className="truncate">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-0"><SidebarSeparator className="mx-0" /></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
