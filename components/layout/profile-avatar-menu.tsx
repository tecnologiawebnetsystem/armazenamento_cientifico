"use client"

import { ChevronDownIcon, LogOutIcon, MailIcon } from "lucide-react"
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
        <Avatar className="size-10 rounded-full ring-2 ring-petrobras-green/30 ring-offset-2 ring-offset-card">
          <AvatarImage src={avatarUrl || "/images/default-avatar.png"} alt={user.avatarUrl ? `Foto de ${user.nome}` : `Avatar padrão de ${user.nome}`} />
          <AvatarFallback className="rounded-full bg-petrobras-green text-xs font-bold text-white">{initials(user.nome)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-36 truncate text-left text-sm font-semibold text-foreground md:flex md:flex-col md:gap-0.5">
          <span className="truncate">{user.nome}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{roleLabel(user.role)}</span>
        </span>
        <ChevronDownIcon className="hidden size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 md:block" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border-petrobras-green/20 bg-card p-0 text-card-foreground shadow-[0_18px_45px_color-mix(in_oklch,var(--petrobras-green)_18%,transparent)]">
        <div className="relative bg-petrobras-green px-5 py-4 text-white"><div className="absolute inset-x-0 top-0 h-1 bg-petrobras-yellow" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight text-balance">{user.nome || user.chaveCav4 || "Usuário corporativo"}</p>
            <p className="mt-0.5 truncate text-[11px] text-white/80">{user.email || "E-mail não informado"}</p>
            <span className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white">Perfil {roleLabel(user.role)}</span>
          </div>
          {(user.area || user.cargo || user.chaveCav4) && <div className="mt-4 flex flex-col gap-0.5 border-t border-white/20 pt-3 text-xs text-white/85"><span className="truncate">{[user.cargo, user.area].filter(Boolean).join(" · ") || "Perfil corporativo"}</span>{user.chaveCav4 && <span className="truncate text-[11px] text-white/70">Chave: {user.chaveCav4}</span>}</div>}
        </div>

        <div className="grid gap-2.5 px-5 py-3.5">
          <div className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><MailIcon className="size-3.5" aria-hidden="true" /></span>
            <div className="min-w-0"><p className="text-[10px] text-muted-foreground">E-mail corporativo</p><p className="break-all text-xs font-semibold leading-snug text-foreground">{user.email || "Não informado"}</p></div>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">{roleDescription(user.role)}</p>
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
