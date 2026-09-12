"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // O erro é tratado pela interface; detalhes sensíveis não são exibidos ao usuário.
  }, [])

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <section className="w-full max-w-lg rounded-2xl border bg-background p-8 text-center shadow-sm">
        <CircleAlert className="mx-auto mb-5 size-12 text-destructive" aria-hidden="true" />
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Erro inesperado</p>
        <h1 className="text-3xl font-bold tracking-tight">Não foi possível concluir</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Ocorreu um problema ao carregar esta página. Tente novamente ou volte ao início.</p>
        <div className="mt-6 flex justify-center gap-3"><Button onClick={reset}>Tentar novamente</Button><Link href="/" className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted">Início</Link></div>
      </section>
    </main>
  )
}
