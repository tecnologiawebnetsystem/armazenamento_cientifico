"use client"

import { ChevronDownIcon, LogOutIcon, MapPinIcon, UserRoundIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import useSWR from "swr"
import { getProfilePhoto, logout } from "@/lib/api-client"
import { roleDescription, roleLabel } from "@/hooks/use-permissions"
import type { User } from "@/lib/types"

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "US"
}

export function ProfileAvatarMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { data: profilePhoto } = useSWR(`/api/profile-photo/${user.email || user.chaveCav4}`, getProfilePhoto, {
    revalidateOnFocus: false,
    onSuccess: (result) => console.info("Foto Entra ID:", result.status, result.reason || "ok"),
    onError: (error) => console.error("Falha ao consultar foto Entra ID:", error),
  })
  const avatarUrl = profilePhoto?.photo || user.avatarUrl

  async function handleLogout() {
    await logout()
    onLogout()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Abrir perfil de ${user.nome}`} className="group flex items-center gap-2 rounded-xl border border-transparent px-1.5 py-1 outline-none transition-all hover:border-petrobras-green/25 hover:bg-petrobras-green/10 focus-visible:ring-2 focus-visible:ring-petrobras-yellow/60 md:pl-2">
        <span className="hidden max-w-44 truncate text-left text-sm font-semibold text-foreground md:flex md:flex-col md:gap-0.5">
          <span className="truncate">{user.nome}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{roleLabel(user.role)}</span>
        </span>
        <ChevronDownIcon className="hidden size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 md:block" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border-petrobras-green/20 bg-card p-0 text-card-foreground shadow-[0_18px_45px_color-mix(in_oklch,var(--petrobras-green)_18%,transparent)]">
        <div className="relative bg-petrobras-green px-5 py-4 text-white"><div className="absolute inset-x-0 top-0 h-1 bg-petrobras-yellow" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <Avatar className="size-14 shrink-0 rounded-full border-2 border-white/70 ring-2 ring-white/20">
              <AvatarImage src={avatarUrl || "/images/default-avatar.png"} alt={user.avatarUrl ? `Foto de ${user.nome}` : `Avatar padrão de ${user.nome}`} />
              <AvatarFallback className="rounded-full bg-petrobras-yellow text-sm font-bold text-petrobras-green">{initials(user.nome)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 pt-0.5">
              <p className="text-base font-bold leading-tight text-balance">{user.nome || user.chaveCav4 || "Usuário corporativo"}</p>
              <p className="mt-1 truncate text-xs text-white/85">{user.email || "E-mail não informado"}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-white/20 pt-3 text-sm text-white/90"><MapPinIcon className="size-4 shrink-0 text-petrobras-yellow" aria-hidden="true" /><span className="truncate">{user.area || user.cargo || "Área corporativa"}</span></div>
        </div>

        <div className="grid gap-2.5 px-5 py-3.5">
          <div className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><UserRoundIcon className="size-3.5" aria-hidden="true" /></span>
            <div className="min-w-0"><p className="text-[10px] text-muted-foreground">Cargo</p><p className="text-sm font-semibold leading-snug text-foreground">{user.cargo || roleLabel(user.role)}</p><p className="mt-0.5 break-all text-xs text-muted-foreground">{user.email || "E-mail não informado"}</p></div>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">{user.chaveCav4 ? `Chave: ${user.chaveCav4}` : roleDescription(user.role)}</p>
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="p-1.5">
          <DropdownMenuItem onClick={handleLogout} variant="destructive" className="h-10 cursor-pointer gap-2.5 rounded-lg px-3 text-sm font-semibold">
            <LogOutIcon />
            Sair
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
