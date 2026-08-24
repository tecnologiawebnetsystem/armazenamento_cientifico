"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { EyeIcon, EyeOffIcon, LoaderCircleIcon, LockIcon, LogInIcon, MailIcon, ShieldCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { login, ApiError } from "@/lib/api-client"

const DEMO_ACCOUNTS = [
  { label: "Administrador", email: "admin@petrobras.com" },
  { label: "Gerente", email: "gestor@petrobras.com" },
  { label: "Patrocinador", email: "participante@petrobras.com" },
  { label: "Auditor", email: "visualizador@petrobras.com" },
]

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, senha)
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.")
    } finally {
      setLoading(false)
    }
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

        <div className="flex flex-col gap-6 px-6 py-6">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Falha na autenticação</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Field>
                <FieldLabel htmlFor="email">Email corporativo</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <MailIcon className="size-4 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nome.sobrenome@petrobras.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel htmlFor="senha">Senha</FieldLabel>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <LockIcon className="size-4 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription>
                  Esqueceu sua senha? Abra um chamado no ServiceNow para redefinição.
                </FieldDescription>
              </Field>

              <Field>
                <Button type="submit" size="lg" disabled={loading} className="w-full">
                  {loading ? (
                    <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <LogInIcon data-icon="inline-start" />
                  )}
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </div>

        <footer className="flex flex-col gap-3 border-t border-border bg-muted/40 px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="h-1 w-6 rounded-full bg-accent" />
            <p className="text-xs font-medium text-muted-foreground">Contas de demonstração (ambiente local)</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <Button
                key={acc.email}
                type="button"
                variant="outline"
                size="sm"
                className="justify-start bg-card"
                onClick={() => {
                  setEmail(acc.email)
                  setSenha(`${acc.email.split("@")[0]}123`)
                }}
              >
                {acc.label}
              </Button>
            ))}
          </div>
        </footer>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Ambiente monitorado. O uso indevido está sujeito às políticas internas de segurança da informação.
      </p>
    </div>
  )
}
