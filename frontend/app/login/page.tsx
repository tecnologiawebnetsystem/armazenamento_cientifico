import { redirect } from "next/navigation"
import Image from "next/image"
import { getSessionUserId } from "@/lib/session"
import { LoginForm } from "@/components/login/login-form"
import { LogoMark } from "@/components/brand/logo-mark"

export default async function LoginPage() {
  const userId = await getSessionUserId()
  if (userId) redirect("/dashboard")

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        <Image
          src="/images/login-hero.png"
          alt=""
          fill
          priority
          className="object-cover opacity-40"
        />
        {/* Camadas de cor da marca: verde profundo + brilho verde/amarelo */}
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-sidebar/85 to-primary/40" />
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-accent/25 blur-3xl" />
        {/* Faixa superior verde/amarelo (identidade Petrobras) */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

        <div className="relative z-10 flex items-center gap-3 text-sidebar-foreground">
          <LogoMark className="size-10" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight">SIGAC</span>
            <span className="text-[10px] text-muted-foreground">Sistema de Gestão de Acesso ao Armazenamento Científico</span>
            <span className="text-xs font-medium text-accent">Petrobras</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <span className="size-1.5 rounded-full bg-accent" />
            Plataforma corporativa
          </span>
          <blockquote className="space-y-4">
            <p className="text-4xl leading-tight font-semibold text-balance text-sidebar-foreground">
              Organize, arquive e compartilhe os dados científicos de cada projeto com{" "}
              <span className="text-accent">segurança e rastreabilidade</span>.
            </p>
            <footer className="text-sm text-sidebar-foreground/80">
              Gestão de dados de pesquisa e desenvolvimento
            </footer>
          </blockquote>
          <div className="grid grid-cols-1 gap-3 border-t border-sidebar-border pt-6 sm:grid-cols-2">
            <span className="flex items-center gap-2 text-sm text-sidebar-foreground/90">
              <span className="flex size-6 items-center justify-center rounded-md bg-accent/15 text-accent">
                <span className="size-1.5 rounded-full bg-accent" />
              </span>
              Controle de acesso por perfil
            </span>
            <span className="flex items-center gap-2 text-sm text-sidebar-foreground/90">
              <span className="flex size-6 items-center justify-center rounded-md bg-accent/15 text-accent">
                <span className="size-1.5 rounded-full bg-accent" />
              </span>
              Trilha de auditoria completa
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary lg:hidden" />

        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
            <LogoMark className="size-10" />
            <span className="font-semibold tracking-tight">SIGAC</span>
            <span className="text-[10px] text-muted-foreground">Sistema de Gestão de Acesso ao Armazenamento Científico</span>
          </div>

          <div className="mb-6 hidden flex-col gap-2 lg:flex">
            <span className="h-1 w-12 rounded-full bg-accent" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Acesse sua conta</h1>
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
