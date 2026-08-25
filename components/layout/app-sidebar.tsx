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
import { useSession } from "@/hooks/use-session"
import { filterNavForRole, navGroups } from "@/lib/nav-config"

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useSession()

  const groups = user ? filterNavForRole(navGroups, user.role) : []

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-0 p-0">
        {/* Faixa da marca Petrobras */}
        <div className="h-1 w-full bg-gradient-to-r from-sidebar-primary via-primary to-sidebar-primary" />
        <SidebarMenu className="p-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Armazenamento Científico"
              render={<Link href="/dashboard" />}
            >
              <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-accent ring-1 ring-sidebar-border">
                <LogoMark className="size-5" />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                <span className="truncate text-sm font-semibold">Armazenamento Científico</span>
                
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="mx-0" />
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1 py-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.14em] text-sidebar-foreground/45 uppercase">
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
                          className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary group-data-[collapsible=icon]:hidden"
                        />
                      ) : null}
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        isActive={isActive}
                        tooltip={item.title}
                        className="h-9 gap-2.5 data-active:bg-sidebar-accent data-active:font-semibold data-active:shadow-[inset_0_1px_0_0_var(--sidebar-border)] [&_svg]:text-sidebar-foreground/70 data-active:[&_svg]:text-sidebar-primary"
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
