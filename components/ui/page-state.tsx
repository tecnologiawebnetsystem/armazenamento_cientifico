import { AlertCircleIcon, InboxIcon, LoaderCircleIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function PageLoading({ label = "Carregando informações..." }: { label?: string }) {
  return <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/70 p-8 text-center" role="status" aria-live="polite"><LoaderCircleIcon className="size-6 animate-spin text-primary" aria-hidden="true" /><p className="text-sm text-muted-foreground">{label}</p></div>
}

export function PageError({ title = "Não foi possível carregar esta página", message = "Verifique sua conexão e tente novamente." }: { title?: string; message?: string }) {
  return <Alert variant="destructive"><AlertCircleIcon aria-hidden="true" /><AlertTitle>{title}</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>
}

export function PageEmpty({ title = "Nenhum registro encontrado", message = "Quando houver informações disponíveis, elas aparecerão aqui." }: { title?: string; message?: string }) {
  return <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/70 p-8 text-center"><InboxIcon className="size-7 text-muted-foreground/70" aria-hidden="true" /><h2 className="text-sm font-semibold">{title}</h2><p className="max-w-md text-sm leading-6 text-muted-foreground">{message}</p></div>
}

export function LoadingButtonContent({ label, loadingLabel = "Salvando...", loading }: { label: string; loadingLabel?: string; loading?: boolean }) {
  return loading ? <><LoaderCircleIcon className="animate-spin" data-icon="inline-start" aria-hidden="true" />{loadingLabel}</> : <>{label}</>
}
