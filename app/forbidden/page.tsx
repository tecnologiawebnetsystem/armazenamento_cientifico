import Link from "next/link"
import { ShieldX } from "lucide-react"

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-lg rounded-2xl border bg-background p-8 text-center shadow-sm">
        <ShieldX className="mx-auto mb-5 size-12 text-destructive" aria-hidden="true" />
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Acesso negado</p>
        <h1 className="text-3xl font-bold tracking-tight">Você não tem permissão</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Seu perfil não possui autorização para acessar este recurso. Solicite acesso ao administrador do sistema.</p>
        <Link href="/" className="mt-6 inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80">Voltar ao início</Link>
      </section>
    </main>
  )
}
