"use client"

import { ChevronDownIcon, LogOutIcon, MapPinIcon, UserRoundIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  const profileStyle = roleThemeStyle(user.role)

  async function handleLogout() {
    await logout()
    onLogout()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Abrir perfil de ${user.nome}`} className="group flex items-center gap-2 rounded-xl border-l border-border/70 pl-2 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/40 md:pl-3">
        <Avatar className="size-10 rounded-full ring-2 ring-[var(--profile-primary)]/25 ring-offset-2 ring-offset-card" style={profileStyle}>
          <AvatarImage src={user.avatarUrl || "/images/default-avatar.png"} alt={user.avatarUrl ? `Foto de ${user.nome}` : `Avatar padrão de ${user.nome}`} />
          <AvatarFallback className="rounded-full bg-[var(--profile-primary)] text-xs font-bold text-white">{initials(user.nome)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-36 truncate text-left text-sm font-semibold text-foreground md:flex md:flex-col md:gap-0.5">
          <span className="truncate">{user.nome}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{roleLabel(user.role)}</span>
        </span>
        <ChevronDownIcon className="hidden size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 md:block" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border-border/70 bg-card p-0 text-card-foreground shadow-xl" style={profileStyle}>
        <div className="bg-[var(--profile-primary)] px-6 py-5 text-white" style={{ background: `linear-gradient(135deg, var(--profile-primary), color-mix(in srgb, var(--profile-primary) 78%, black))` }}>
          <div className="flex items-start gap-4">
            <Avatar className="size-16 shrink-0 rounded-full border-2 border-white/70 ring-4 ring-white/15">
              <AvatarImage src={user.avatarUrl || "/images/default-avatar.png"} alt={`Foto de ${user.nome}`} />
              <AvatarFallback className="rounded-full bg-white/15 text-lg font-bold text-white">{initials(user.nome)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-lg font-bold leading-tight text-balance">{user.nome}</p>
              <p className="mt-1 truncate text-sm text-white/80">{user.email || "E-mail não informado"}</p>
              <span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">{roleLabel(user.role)} · {theme.label}</span>
            </div>
          </div>
          {(user.area || user.cargo) && <div className="mt-5 flex items-center gap-2 border-t border-white/20 pt-4 text-sm text-white/85"><MapPinIcon className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{[user.area, user.cargo].filter(Boolean).join(" · ")}</span></div>}
        </div>

        <div className="px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><UserRoundIcon className="size-4" aria-hidden="true" /></span>
            <div className="min-w-0"><p className="text-xs text-muted-foreground">Perfil de acesso</p><p className="font-semibold text-foreground">{roleDescription(user.role)}</p></div>
          </div>
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="p-2"><DropdownMenuItem onClick={handleLogout} variant="destructive" className="h-12 cursor-pointer gap-3 rounded-xl px-4 text-sm font-semibold"><LogOutIcon />Sair</DropdownMenuItem></div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
