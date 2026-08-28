import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-lg rounded-2xl border bg-background p-8 text-center shadow-sm">
        <FileQuestion className="mx-auto mb-5 size-12 text-primary" aria-hidden="true" />
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Erro 404</p>
        <h1 className="text-3xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">A página solicitada não existe ou foi removida.</p>
        <Button asChild className="mt-6"><Link href="/">Voltar ao início</Link></Button>
      </section>
    </main>
  )
}
