import { LoaderCircle } from "lucide-react"

interface PetrobrasLoadingProps {
  label?: string
  className?: string
}

export function PetrobrasLoading({ label = "Carregando dados...", className = "" }: PetrobrasLoadingProps) {
  return (
    <div className={`flex min-h-64 flex-col items-center justify-center gap-5 rounded-2xl border border-primary/10 bg-background/80 p-8 shadow-sm ${className}`} role="status" aria-live="polite">
      <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
        <span className="absolute inset-1 rounded-xl border-2 border-transparent border-t-primary border-r-accent animate-spin" />
        <LoaderCircle className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="flex w-full max-w-xs flex-col items-center gap-3">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="h-1 w-full overflow-hidden rounded-full bg-muted"><span className="block h-full w-1/2 animate-pulse rounded-full bg-primary" /></span>
        <span className="text-xs text-muted-foreground">Preparando seu ambiente de trabalho</span>
      </div>
    </div>
  )
}
