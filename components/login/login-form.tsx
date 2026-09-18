"use client"

import { useState } from "react"
import { Building2Icon, MailIcon, ShieldCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useLogin } from "@/hooks/use-login"

export function LoginForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const [email, setEmail] = useState("")
  const { loading, error, corporateLogin, emailLogin } = useLogin(nextPath)

  return (
    <div className="relative">
      {/* Brilho discreto inspirado no degradê institucional da referência */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-petrobras-blue/12 via-transparent to-petrobras-green/12 blur-2xl"
      />

      <div className="overflow-hidden rounded-2xl border border-[#dbe4ea] bg-white shadow-[0_18px_50px_rgba(6,63,88,0.10)] ring-1 ring-[#063f58]/[0.04]">
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
              {error && (
                <Alert variant="destructive" className="border-destructive/30 shadow-sm">
                  <AlertTitle>Falha na autenticação</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-3 text-center">
                <p className="text-sm leading-6 text-muted-foreground">Use o acesso corporativo para validar sua identidade e carregar seus dados. As permissões são definidas pelo banco SIGAC.</p>
                <form onSubmit={(event) => { event.preventDefault(); void emailLogin(email) }} className="mx-auto flex w-full max-w-[18rem] flex-col gap-2 text-left">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
                  <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu.email@empresa.com" className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" disabled={loading !== null} />
                  <Button type="submit" size="lg" disabled={loading !== null}>
                    <MailIcon data-icon="inline-start" />
                    {loading === "email" ? "Entrando..." : "Entrar pelo e-mail"}
                  </Button>
                </form>
                <div className="mx-auto flex w-full max-w-[18rem] items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
                <Button type="button" size="lg" variant="outline" onClick={corporateLogin} disabled={loading !== null} className="mx-auto w-full max-w-[18rem] border-[#063f58] bg-gradient-to-r from-[#063f58] to-[#fdbb30] text-white shadow-md shadow-[#063f58]/30 transition-all hover:-translate-y-0.5 hover:from-[#042d40] hover:to-[#e8aa19] hover:shadow-lg hover:shadow-[#063f58]/40">
                  <Building2Icon data-icon="inline-start" />
                  {loading === "corporate" ? "Conectando..." : "Login corporativo CAV4"}
                </Button>
                <p className="pt-1 text-xs text-muted-foreground">© 2026 Petrobras. Todos os direitos reservados.</p>
              </div>
            </>
          )}
        </div>

      </div>

    </div>
  )
}
