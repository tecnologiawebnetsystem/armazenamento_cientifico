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
  const manualLoginEnabled = [
    process.env.NEXT_PUBLIC_EMAIL_LOGIN_ENABLED,
    process.env.NEXT_PUBLIC_EMAIL_LOGIN_ENABLE,
    process.env.NEST_PUBLIC_EMAIL_LOGIN_ENABLED,
    process.env.NEST_PUBLIC_EMAIL_LOGIN_ENABLE,
  ].some((value) => value?.trim().toLowerCase() === "true")
  const { loading, error, manualLogin, corporateLogin } = useLogin(nextPath)
  const rawError = accessError || error
  const isSolicitanteCav4Error = typeof rawError === "string" && /solicitante|requester|\bsol\b|cav4.*perfil|perfil.*cav4|access[_ -]?denied|forbidden|sem permiss[aã]o|n[aã]o autorizado|unauthorized/i.test(rawError)
  const visibleError = isSolicitanteCav4Error
    ? "Seu perfil de Solicitante no CAV4 não tem permissão para acessar o Dashboard SIGAC."
    : rawError

  return (
    <div className="relative">
      <div className="flex items-center gap-2 pb-5 text-sm font-medium text-[#31577f] lg:hidden">
        <ShieldCheckIcon className="size-4 text-petrobras-green" />
        Acesso à plataforma
      </div>
      <div className="flex flex-col gap-8">
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
              {visibleError && (
                <Alert
                  variant={isSolicitanteCav4Error || accessError ? "default" : "destructive"}
                  className={isSolicitanteCav4Error || accessError
                    ? "border-petrobras-yellow/50 bg-petrobras-yellow/10 px-4 py-3 text-foreground shadow-sm"
                    : "border-destructive/30 shadow-sm"}
                  role="alert"
                >
                  <div className="flex flex-col gap-1">
                    <AlertTitle className="text-sm font-semibold">
                      {isSolicitanteCav4Error || accessError ? "Acesso restrito" : "Não foi possível concluir o login"}
                    </AlertTitle>
                    <AlertDescription className="text-sm leading-6 text-foreground/80">
                      {isSolicitanteCav4Error
                        ? "Seu perfil de Solicitante no CAV4 não possui permissão para acessar o Dashboard SIGAC. Se precisar de acesso, procure o administrador responsável pelo seu perfil."
                        : visibleError}
                    </AlertDescription>
                  </div>
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
                <Button type="button" size="lg" variant="outline" onClick={corporateLogin} disabled={loading !== null} className="h-14 w-full border-[#2f6cb9] bg-[#2f6cb9] text-base font-semibold text-white shadow-none transition-colors hover:bg-[#255d9f]">
                  <span>Login Corporativo</span>
                  <span aria-hidden="true" className="text-xl leading-none">›</span>
                </Button>
                <p className="pt-1 text-center text-xs text-muted-foreground">A autenticação corporativa é realizada pelo CAV4. Após o retorno, o SIGAC carrega seu perfil, menus e permissões.</p>
                <p className="text-center text-xs text-muted-foreground">© 2026 Petrobras. Todos os direitos reservados.</p>
              </div>
            </>
          )}
      </div>
    </div>
  )
}
