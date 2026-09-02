import { AlertCircleIcon } from "lucide-react"

export function LoginFieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1 text-sm text-destructive" role="alert">
      <AlertCircleIcon aria-hidden="true" />
      {children}
    </p>
  )
}
