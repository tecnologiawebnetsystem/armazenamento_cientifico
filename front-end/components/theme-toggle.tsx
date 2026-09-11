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
        "h-9 w-auto gap-2 rounded-full border border-border/70 bg-muted/40 px-3 text-muted-foreground shadow-none transition-all",
        "hover:border-primary/30 hover:bg-primary/10 hover:text-primary",
      )}
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border/60">
        {isDark ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
      </span>
      <span className="hidden text-xs font-semibold sm:inline">{label}</span>
    </Button>
  )
}
