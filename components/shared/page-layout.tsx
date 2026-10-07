import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BackButton } from "@/components/navigation/back-button"

type PageLayoutProps = {
  children: ReactNode
  className?: string
  back?: boolean
}

export function PageLayout({ children, className, back = false }: PageLayoutProps) {
  return (
    <div className={cn("flex flex-col gap-8 pb-4", className)}>
      {back ? <BackButton /> : null}
      {children}
    </div>
  )
}

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("sigac-surface relative isolate flex min-h-[150px] flex-col justify-center gap-4 overflow-hidden rounded-[1.5rem] border border-border/70 px-6 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-7", className)}>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-primary/6 to-transparent" aria-hidden="true" />
      <div className="relative min-w-0 flex-1">
        {eyebrow ? <p className="mb-4 font-mono text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">{eyebrow}</p> : null}
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.035em] text-foreground text-balance sm:text-4xl lg:text-[2.65rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="relative flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

export function PageSection({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return <section aria-label={label} className={cn("flex flex-col gap-4", className)}>{children}</section>
}

export function PageToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
}
