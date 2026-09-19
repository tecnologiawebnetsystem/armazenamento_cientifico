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
    <div className={cn("flex flex-col gap-6", className)}>
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
    <header className={cn("flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="mb-2 font-sans text-xs font-semibold tracking-[0.16em] text-primary uppercase">{eyebrow}</p> : null}
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-foreground text-balance sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

export function PageSection({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return <section aria-label={label} className={cn("flex flex-col gap-4", className)}>{children}</section>
}

export function PageToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
}
