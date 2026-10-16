"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useState } from "react"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { usePlatformContext } from "@/hooks/use-platform-context"
import { ChartNoAxesCombinedIcon, ChevronDownIcon, FolderKanbanIcon, LayoutDashboardIcon, NetworkIcon, SettingsIcon, ShieldCheckIcon, type LucideIcon } from "lucide-react"
import type { NavGroup, NavItem } from "@/lib/nav-config"

import type { PlatformMenu } from "@/lib/types"

const configurationGroups = [
  {
    label: "Estrutura do sistema",
    description: "Defina a base da navegação e dos módulos.",
    items: [
      { label: "Módulos do sistema", key: "modules" },
      { label: "Menus do sistema", key: "menus" },
    ],
  },
  {
    label: "Acesso e segurança",
    description: "Organize perfis, permissões e vínculos de acesso.",
    items: [
      { label: "Perfis de acesso", key: "profiles" },
      { label: "Permissões disponíveis", key: "permissions" },
      { label: "Permissões por perfil", key: "profile_permissions" },
      { label: "Módulos por perfil", key: "profile_modules" },
      { label: "Acesso aos menus", key: "menu_permissions" },
    ],
  },
  {
    label: "Operação",
    description: "Configure os cadastros usados no dia a dia.",
    items: [
      { label: "Status dos projetos", key: "project_statuses" },
      { label: "Áreas responsáveis", key: "responsible_areas" },
    ],
  },
  {
    label: "Relatórios e dashboard",
    description: "Defina as informações exibidas nas análises.",
    items: [
      { label: "Tipos de relatório", key: "report_types" },
      { label: "Campos dos relatórios", key: "report_fields" },
      { label: "Cards do dashboard", key: "dashboard_cards" },
    ],
  },
] as const

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

function buildNavGroups(menus: PlatformMenu[]): NavGroup[] {
  const uniqueMenus = Array.from(
    new Map(
      menus
        .filter((menu) => menu.rota)
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
  const searchParams = useSearchParams()
  const { menus } = usePlatformContext()
  const activeResource = searchParams.get("tabela")
  const initialGroup = configurationGroups.find((group) => group.items.some((item) => item.key === activeResource))?.label ?? configurationGroups[0].label
  const [expandedGroups, setExpandedGroups] = useState<string[]>([initialGroup])
  const homeHref = menus[0]?.rota ?? "/forbidden"
  const groups = buildNavGroups(menus)

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
                      {item.url === "/configuracoes" && isActive ? (
                        <SidebarMenuSub className="ml-3 border-sidebar-border/40 pl-3 group-data-[collapsible=icon]:hidden">
                          {configurationGroups.map((group) => {
                            const isExpanded = expandedGroups.includes(group.label)
                            const containsActiveItem = group.items.some((item) => item.key === activeResource)
                            return (
                              <li key={group.label} className="mb-2 last:mb-0">
                                <button type="button" aria-expanded={isExpanded} aria-controls={`configuration-group-${group.label}`} onClick={() => setExpandedGroups((current) => isExpanded ? current.filter((item) => item !== group.label) : [...current, group.label])} className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${containsActiveItem ? "text-sidebar-primary" : "text-sidebar-primary/80"}`}>
                                  <span className="text-[10px] font-semibold uppercase tracking-wider">{group.label}</span>
                                  <ChevronDownIcon aria-hidden className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                                {isExpanded ? <div id={`configuration-group-${group.label}`}>
                                  <div className="px-2 pb-1 text-[10px] leading-4 text-sidebar-foreground/45">{group.description}</div>
                                  <ul>
                                    {group.items.map((submenu) => {
                                      const href = `/configuracoes?tabela=${submenu.key}`
                                      const submenuActive = pathname === "/configuracoes" && searchParams.get("tabela") === submenu.key
                                      return (
                                        <SidebarMenuSubItem key={submenu.key}>
                                          <SidebarMenuSubButton render={<Link href={href} />} isActive={submenuActive} className="h-8 rounded-md text-xs text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-foreground data-active:shadow-[inset_2px_0_0_var(--sidebar-primary)]">
                                            <span className="truncate">{submenu.label}</span>
                                          </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                      )
                                    })}
                                  </ul>
                                </div> : null}
                              </li>
                            )
                          })}
                        </SidebarMenuSub>
                      ) : null}
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
