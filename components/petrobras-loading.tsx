import { LoaderCircle } from "lucide-react"

interface PetrobrasLoadingProps {
  label?: string
  className?: string
}

export function PetrobrasLoading({ label = "Carregando dados...", className = "" }: PetrobrasLoadingProps) {
  return (
    <div className={`flex min-h-40 flex-col items-center justify-center gap-3 ${className}`} role="status" aria-live="polite">
      <div className="relative flex size-12 items-center justify-center rounded-full border-4 border-primary/20">
        <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-accent animate-spin" />
        <LoaderCircle className="size-5 text-primary" aria-hidden="true" />
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
