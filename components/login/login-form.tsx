"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { Building2Icon, MailIcon, ShieldCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoginFieldError } from "@/components/login/login-field-error"
import { useLogin } from "@/hooks/use-login"

export function LoginForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const { loading, error, emailLogin, corporateLogin } = useLogin(nextPath)

  useEffect(() => emailRef.current?.focus(), [])

  function validateEmail(value: string) {
    if (!value.trim()) return "Informe seu e-mail para continuar."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Informe um e-mail válido."
    return null
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateEmail(email)
    setEmailError(validationError)
    if (validationError) return
    await emailLogin(email.trim())
  }

  return (
    <div className="relative">
      {/* Brilho discreto inspirado no degradê institucional da referência */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-petrobras-blue/12 via-transparent to-petrobras-green/12 blur-2xl"
      />

      <div className="overflow-hidden rounded-2xl border border-petrobras-green/20 bg-card/95 shadow-2xl shadow-petrobras-blue/10 ring-1 ring-petrobras-green/10 backdrop-blur-sm">
        {/* Faixa verde/amarelo Petrobras */}
        <div className="h-1.5 bg-gradient-to-r from-petrobras-blue via-petrobras-green to-petrobras-yellow" />

        <header className="flex items-center gap-3 border-b border-petrobras-green/15 bg-card px-6 py-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrobras-blue text-primary-foreground shadow-md shadow-petrobras-blue/20">
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

              <form className="flex flex-col gap-4" onSubmit={handleEmailLogin}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-email">E-mail cadastrado</Label>
                  <div className="relative">
                    <MailIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      ref={emailRef}
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="nome@empresa.com.br"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={loading !== null}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? "login-email-error" : undefined}
                      className="border-petrobras-green/20 bg-background/80 pl-9 shadow-sm transition-colors focus-visible:border-petrobras-blue focus-visible:ring-petrobras-green/30"
                      required
                    />
                    {emailError && <LoginFieldError id="login-email-error">{emailError}</LoginFieldError>}
                  </div>
                </div>
                <Button type="submit" size="lg" disabled={loading !== null} className="w-full bg-petrobras-blue text-primary-foreground shadow-md shadow-petrobras-blue/20 transition-all hover:-translate-y-0.5 hover:bg-petrobras-teal hover:shadow-lg">
                  {loading === "email" ? <Spinner aria-label="Validando e-mail" /> : "Entrar com e-mail"}
                </Button>
              </form>

              <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span>ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="flex flex-col gap-3 text-center">
                <p className="text-sm leading-6 text-muted-foreground">Use o acesso corporativo para validar sua identidade e carregar seus papéis e permissões.</p>
                <Button type="button" size="lg" variant="outline" onClick={corporateLogin} disabled={loading !== null} className="w-full border-petrobras-blue/25 bg-white text-foreground shadow-md shadow-petrobras-blue/10 transition-all hover:-translate-y-0.5 hover:border-petrobras-blue/45 hover:bg-petrobras-blue/5 hover:shadow-lg">
                  <Building2Icon data-icon="inline-start" />
                  {loading === "corporate" ? "Conectando..." : "Login corporativo"}
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
