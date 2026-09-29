import { cn } from "@/lib/utils"

export type PetrobrasLoadingVariant = "page" | "content" | "action" | "overlay"

export interface SigacLoaderProps {
  label?: string
  className?: string
}

interface PetrobrasLoadingProps extends SigacLoaderProps {
  variant?: PetrobrasLoadingVariant
}

function DataFlow() {
  return (
    <div className="sigac-data-flow" aria-hidden="true">
      <span className="sigac-data-flow__node" />
      <span className="sigac-data-flow__line" />
      <span className="sigac-data-flow__node sigac-data-flow__node--active" />
      <span className="sigac-data-flow__line" />
      <span className="sigac-data-flow__node" />
    </div>
  )
}

export function PetrobrasLoading({
  label = "Carregando dados...",
  className,
  variant = "content",
}: PetrobrasLoadingProps) {
  const isPage = variant === "page"
  const isOverlay = variant === "overlay"

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 text-center",
        isPage && "min-h-dvh bg-background px-6",
        isOverlay && "fixed inset-0 z-50 bg-background/80 px-6 backdrop-blur-[2px]",
        !isPage && !isOverlay && "min-h-52 rounded-2xl border border-petrobras-green/15 bg-card/95 p-8 shadow-sm",
        variant === "action" && "min-h-0 flex-row gap-3 rounded-lg border-0 bg-transparent p-0 shadow-none",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {variant !== "action" && <span className="text-xs font-semibold uppercase tracking-[0.22em] text-petrobras-green">SIGAC</span>}
      <div className={cn("flex items-center justify-center", !isPage && !isOverlay && "size-12 rounded-xl border border-primary/15 bg-primary/5")}>
        <DataFlow />
      </div>
      <div className={cn("flex flex-col items-center gap-1.5", variant === "action" && "items-start")}>
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {variant !== "action" && <span className="text-xs text-muted-foreground">Fluxo de dados em processamento</span>}
      </div>
    </div>
  )
}

export function SigacPageLoader(props: SigacLoaderProps) {
  return <PetrobrasLoading {...props} variant="page" />
}

export function SigacContentLoader(props: SigacLoaderProps) {
  return <PetrobrasLoading {...props} variant="content" />
}

export function SigacOverlayLoader(props: SigacLoaderProps) {
  return <PetrobrasLoading {...props} variant="overlay" />
}

export function SigacActionLoader(props: SigacLoaderProps) {
  return <PetrobrasLoading {...props} variant="action" />
}
