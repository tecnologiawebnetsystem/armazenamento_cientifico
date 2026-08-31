"use client"

import { useState } from "react"
import { Building2Icon, ShieldCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleCorporateLogin() {
    setError(null)
    setLoading(true)
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "")
    window.location.assign(`${apiBase}/api/auth/entra/login`)
  }

  return (
    <div className="relative">
      {/* Brilho da marca atrás do widget */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-accent/25 blur-2xl"
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-primary/10">
        {/* Faixa verde/amarelo Petrobras */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

        <header className="flex items-center gap-3 border-b border-border bg-gradient-to-b from-secondary/70 to-card px-6 py-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/40">
            <ShieldCheckIcon className="size-5" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight text-foreground">Acesso à plataforma</span>
            <span className="text-xs text-muted-foreground">Autenticação corporativa Petrobras</span>
          </div>
        </header>

        <div className="flex flex-col gap-8 px-6 py-8">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Falha na autenticação</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 text-center">
            <p className="text-sm leading-6 text-muted-foreground">Colaboradores Petrobras devem acessar utilizando o botão Login corporativo abaixo.</p>
            <Button type="button" size="lg" variant="outline" onClick={handleCorporateLogin} disabled={loading} className="mx-auto w-full max-w-xs border-petrobras-green bg-gradient-to-r from-petrobras-green via-petrobras-green to-petrobras-yellow text-primary-foreground shadow-lg shadow-petrobras-yellow/25 transition-all hover:brightness-105 hover:shadow-xl hover:shadow-petrobras-yellow/35">
              <Building2Icon data-icon="inline-start" />
              Login Corporativo
            </Button>
            <p className="pt-1 text-xs text-muted-foreground">© 2026 Petrobras. Todos os direitos reservados.</p>
          </div>
        </div>

      </div>

    </div>
  )
}
