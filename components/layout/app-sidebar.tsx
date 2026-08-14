"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FlaskConicalIcon, LogOutIcon } from "lucide-react"
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
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useSession } from "@/hooks/use-session"
import { filterNavForRole, navGroups } from "@/lib/nav-config"
import { logout } from "@/lib/api-client"
import { useRouter } from "next/navigation"
import { roleLabel } from "@/hooks/use-permissions"

function initials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useSession()

  const groups = user ? filterNavForRole(navGroups, user.role) : []

  async function handleLogout() {
    await logout()
    router.push("/login")
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary">
                <FlaskConicalIcon className="size-4 text-sidebar-primary-foreground" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Armazenamento Científico</span>
                <span className="text-xs text-sidebar-foreground/60">Petrobras</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`)
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
              <Avatar className="size-7">
                <AvatarImage src={user?.avatarUrl || "/placeholder-user.jpg"} alt={user?.nome ?? ""} />
                <AvatarFallback className="text-xs">{user ? initials(user.nome) : ""}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium text-sidebar-foreground">{user?.nome}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {user ? roleLabel(user.role) : ""}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
                aria-label="Sair"
                onClick={handleLogout}
              >
                <LogOutIcon />
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
