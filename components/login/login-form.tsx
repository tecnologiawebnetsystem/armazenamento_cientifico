"use client"

import { useState } from "react"
import { ShieldCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useLogin } from "@/hooks/use-login"

export function LoginForm({ nextPath = "/dashboard", authError }: { nextPath?: string; authError?: string }) {
  const [email, setEmail] = useState("")
  const accessError = authError
  const manualLoginEnabled = process.env.NEXT_PUBLIC_EMAIL_LOGIN_ENABLED === "true"
  const { loading, error, manualLogin, corporateLogin } = useLogin(nextPath)

  return (
    <div className="relative">
      {/* Brilho discreto inspirado no degradê institucional da referência */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-petrobras-blue/12 via-transparent to-petrobras-green/12 blur-2xl"
      />

      <div className="overflow-hidden rounded-2xl border border-white/50 bg-white shadow-[0_24px_60px_rgba(0,40,24,0.28)] ring-1 ring-petrobras-yellow/20">
        {/* Faixa verde/amarelo Petrobras */}
        <div className="h-1.5 bg-gradient-to-r from-petrobras-blue via-petrobras-green to-petrobras-yellow" />

        <header className="flex items-center gap-3 border-b border-[#e5ebef] bg-white px-6 py-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#063f58] text-white shadow-md shadow-[#063f58]/20">
            <ShieldCheckIcon className="size-5" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight text-foreground">Acesso à plataforma</span>
            <span className="text-xs text-muted-foreground">Autenticação corporativa Petrobras</span>
          </div>
        </header>

          <div className="flex flex-col gap-8 px-6 py-8">
          {loading ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-5 text-center" role="status" aria-live="polite">
              <div className="relative flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-inner shadow-primary/10">
                <Spinner className="size-7" aria-label="Carregando autenticação" />
                <span className="absolute inset-0 rounded-2xl border border-accent/40 motion-safe:animate-ping" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="font-semibold tracking-tight text-foreground">Conectando com o acesso corporativo</p>
                <p className="text-sm leading-6 text-muted-foreground">Estamos validando suas credenciais com segurança. Aguarde um momento.</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden="true" />
                Conectando ao ambiente corporativo CAV4
              </div>
            </div>
          ) : (
            <>
              {(error || accessError) && (
                <Alert variant="destructive" className="border-destructive/30 shadow-sm">
                  <AlertTitle>{accessError ? "Acesso não autorizado" : "Falha na autenticação"}</AlertTitle>
                  <AlertDescription>{accessError || error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-5">
                {manualLoginEnabled && (
                  <>
                    <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); void manualLogin(email) }}>
                      <label htmlFor="login-email" className="text-left text-sm font-medium text-foreground">E-mail</label>
                      <input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu.email@empresa.com" required className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring" />
                      <Button type="submit" size="lg" disabled={loading !== null} className="w-full">{loading === "manual" ? "Entrando..." : "Entrar com e-mail"}</Button>
                    </form>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true"><span className="h-px flex-1 bg-border" /><span>ou</span><span className="h-px flex-1 bg-border" /></div>
                  </>
                )}
                <Button type="button" size="lg" variant="outline" onClick={corporateLogin} disabled={loading !== null} className="w-full border-[#063f58] bg-gradient-to-r from-[#063f58] to-[#fdbb30] text-white shadow-md shadow-[#063f58]/30 transition-all hover:-translate-y-0.5 hover:from-[#042d40] hover:to-[#e8aa19] hover:shadow-lg hover:shadow-[#063f58]/40">
                  Login Corporativo
                </Button>
                <p className="pt-1 text-center text-xs text-muted-foreground">A autenticação corporativa é realizada pelo CAV4. Após o retorno, o SIGAC carrega seu perfil, menus e permissões do banco de dados.</p>
                <p className="text-center text-xs text-muted-foreground">© 2026 Petrobras. Todos os direitos reservados.</p>
              </div>
            </>
          )}
        </div>

      </div>

    </div>
  )
}
