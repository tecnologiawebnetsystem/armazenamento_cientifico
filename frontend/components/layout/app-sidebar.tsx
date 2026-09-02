"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useSession } from "@/hooks/use-session"
import { filterNavForRole, navGroups } from "@/lib/nav-config"

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useSession()
  const [search] = useState("")

  const groups = user ? filterNavForRole(navGroups, user.role).map((group) => ({ ...group, items: group.items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())) })).filter((group) => group.items.length) : []

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border/70 bg-sidebar shadow-2xl shadow-sidebar/20 transition-[width] duration-200 md:flex">
      <SidebarHeader className="gap-0 p-0">
        {/* Faixa da marca Petrobras */}
        <div className="h-1 w-full bg-gradient-to-r from-sidebar-primary via-sidebar-primary/70 to-sidebar-primary" />
        <SidebarMenu className="p-3">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico"
              render={<Link href="/dashboard" />}
            >
              <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-accent ring-1 ring-sidebar-border">
                <LogoMark className="size-5" />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                <span className="truncate text-sm font-semibold">SIGAC</span>
                <span className="hidden truncate text-[10px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">Sistema de Gestão de Acesso ao Armazenamento Científico</span>
                
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="mx-0" />
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1 py-2">
        
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="border-b border-sidebar-border/40 px-2 py-3 last:border-b-0">
            <SidebarGroupLabel className="h-7 px-2 text-[10px] font-semibold tracking-[0.16em] text-sidebar-foreground/55 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`)
                  return (
                    <SidebarMenuItem key={item.url} className="relative">
                      {isActive ? (
                        <span
                          aria-hidden
                          className="absolute top-1/2 left-0 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-sidebar-primary shadow-[0_0_10px_var(--sidebar-primary)] group-data-[collapsible=icon]:hidden"
                        />
                      ) : null}
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        isActive={isActive}
                        tooltip={item.title}
                        className="h-10 gap-3 rounded-lg px-3 text-[13px] font-medium text-sidebar-foreground/78 transition-all duration-200 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-foreground data-active:shadow-[inset_0_1px_0_0_var(--sidebar-border),0_6px_16px_color-mix(in_oklch,var(--sidebar)_35%,transparent)] [&_svg]:text-sidebar-foreground/60 data-active:[&_svg]:text-sidebar-primary"
                      >
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

      <SidebarFooter className="p-0">
        <SidebarSeparator className="mx-0" />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
