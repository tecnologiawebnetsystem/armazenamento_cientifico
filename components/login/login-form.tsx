"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { EyeIcon, EyeOffIcon, LoaderCircleIcon, LogInIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { login, ApiError } from "@/lib/api-client"

const DEMO_ACCOUNTS = [
  { label: "Administrador", email: "admin@petrobras.com" },
  { label: "Gerente", email: "gestor@petrobras.com" },
  { label: "Patrocinador", email: "participante@petrobras.com" },
  { label: "Visualizador", email: "visualizador@petrobras.com" },
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
    <div className="flex flex-col gap-6">
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
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nome.sobrenome@petrobras.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="senha">Senha</FieldLabel>
            <InputGroup>
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
            <Button type="submit" disabled={loading}>
              {loading ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <LogInIcon data-icon="inline-start" />}
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <div className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">Contas de demonstração (ambiente local)</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <Button
              key={acc.email}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEmail(acc.email)
                setSenha(`${acc.email.split("@")[0]}123`)
              }}
            >
              {acc.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
