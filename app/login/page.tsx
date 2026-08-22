import { redirect } from "next/navigation"
import Image from "next/image"
import { getSessionUserId } from "@/lib/session"
import { findUserById } from "@/lib/store"
import { LoginForm } from "@/components/login/login-form"
import { LogoMark } from "@/components/brand/logo-mark"
import { ThemeToggle } from "@/components/theme-toggle"

export default async function LoginPage() {
  const userId = await getSessionUserId()
  const user = findUserById(userId)
  if (user) redirect("/dashboard")

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        <Image
          src="/images/login-hero.png"
          alt=""
          fill
          priority
          className="object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/75 to-sidebar/40" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

        <div className="relative z-10 flex items-center gap-3 text-sidebar-foreground">
          <LogoMark className="size-9" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight">Armazenamento Científico</span>
            <span className="text-xs text-sidebar-foreground/70">Petrobras</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <blockquote className="space-y-4">
            <p className="text-3xl leading-snug font-semibold text-balance text-sidebar-foreground">
              Organize, arquive e compartilhe os dados científicos de cada projeto com segurança e
              rastreabilidade.
            </p>
            <footer className="text-sm text-sidebar-foreground/70">
              Plataforma corporativa de armazenamento científico
            </footer>
          </blockquote>
          <div className="flex items-center gap-6 border-t border-sidebar-border pt-5 text-xs text-sidebar-foreground/60">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent" />
              Controle de acesso por perfil
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent" />
              Trilha de auditoria completa
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
            <LogoMark className="size-10" />
            <span className="font-semibold tracking-tight">Armazenamento Científico</span>
          </div>

          <div className="mb-6 hidden flex-col gap-1 lg:flex">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Acesse sua conta</h1>
            <p className="text-sm text-muted-foreground">
              Use seu email corporativo Petrobras para entrar na plataforma.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
