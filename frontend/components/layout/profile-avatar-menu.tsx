"use client"

import { LogOutIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { logout } from "@/lib/api-client"
import { roleDescription, roleLabel } from "@/hooks/use-permissions"
import { roleThemeStyle, themeForRole } from "@/lib/theme-config"
import type { User } from "@/lib/types"

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "US"
}

export function ProfileAvatarMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const theme = themeForRole(user.role)

  async function handleLogout() {
    await logout()
    onLogout()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Abrir perfil de ${user.nome}`} className="flex items-center gap-2 rounded-xl border-l border-border/70 pl-2 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/40 md:pl-3">
        <Avatar className="size-9 rounded-xl ring-2 ring-primary/10">
          <AvatarImage src={user.avatarUrl || "/images/default-avatar.png"} alt={user.avatarUrl ? `Foto de ${user.nome}` : `Avatar padrão de ${user.nome}`} />
          <AvatarFallback className="rounded-xl bg-primary text-[11px] font-bold text-primary-foreground">{initials(user.nome)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-36 truncate text-xs font-semibold text-foreground md:inline">{user.nome}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border-[var(--profile-primary)]/40 bg-[var(--profile-background)] text-[var(--profile-text)]" style={roleThemeStyle(user.role)}>
        <div className="flex flex-col gap-1 px-2 py-2">
          <span className="truncate text-sm font-semibold">{user.nome}</span>
          <span className="truncate text-xs opacity-75">{user.email}</span>
          <span className="text-[11px] leading-4 opacity-75">{user.cargo || "Colaborador"}{user.area ? ` · ${user.area}` : ""}</span>
          <span className="text-[11px] leading-4 opacity-75">{roleDescription(user.role)}</span>
          <Badge className="mt-1 w-fit border-0 bg-[var(--profile-accent)] px-1.5 py-0 text-[10px] font-medium text-[var(--profile-text)]">{roleLabel(user.role)} · {theme.label}</Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} variant="destructive"><LogOutIcon />Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
