import { ShieldCheckIcon } from "lucide-react"

export function AppFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/80 px-4 py-3 text-[11px] text-muted-foreground backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-medium tracking-wide"><span className="text-foreground">SIGAC</span><span aria-hidden="true">·</span><span>Petrobras</span><span className="hidden text-border sm:inline" aria-hidden="true">|</span><span className="hidden sm:inline">Sistema corporativo de governança de acesso</span></div>
        <div className="flex items-center gap-2"><ShieldCheckIcon aria-hidden="true" /><span>Ambiente protegido</span><span className="text-border" aria-hidden="true">·</span><span>v1.0</span></div>
      </div>
    </footer>
  )
}
