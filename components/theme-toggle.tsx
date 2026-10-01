"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const isDark = mounted && resolvedTheme === "dark"
  const label = isDark ? "Modo claro" : "Modo escuro"

  return (
    <Button
      variant="ghost"
      onClick={() => mounted && setTheme(isDark ? "light" : "dark")}
      disabled={!mounted}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={label}
      className={cn(
        "size-9 rounded-xl border border-petrobras-yellow/35 bg-petrobras-yellow/10 p-0 text-petrobras-yellow shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-petrobras-green/50 hover:bg-petrobras-green/10 hover:text-petrobras-green",
      )}
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border/60">
        {isDark ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
      </span>
    </Button>
  )
}
