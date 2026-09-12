import Image from "next/image"
import { LoginForm } from "@/components/login/login-form"
import { LogoMark } from "@/components/brand/logo-mark"

export default function LoginPage() {
  return (
    <div className="light grid min-h-svh bg-background text-foreground lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 shadow-2xl shadow-petrobras-blue/20 lg:flex">
        <Image
          src="/images/login-hero.png"
          alt=""
          fill
          priority
          className="object-cover opacity-[0.08] mix-blend-screen"
        />
        {/* Camadas de cor da marca: verde profundo + brilho verde/amarelo */}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#063f58_0%,#075b70_42%,#008f5a_76%,#12a85b_100%)]" />
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-petrobras-blue/35 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-petrobras-green/35 blur-3xl" />
        {/* Faixa superior verde/amarelo (identidade Petrobras) */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-petrobras-yellow via-petrobras-yellow to-petrobras-green" />

        <div className="relative z-10 flex items-center gap-3 text-sidebar-foreground">
          <LogoMark className="size-10" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight">SIGAC</span>
            <span className="text-[10px] text-white">Sistema de Gestão de Acesso ao Armazenamento Científico</span>
            <span className="text-xs font-medium text-accent">Petrobras</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6 rounded-2xl border border-white/20 bg-[#063f58]/25 p-6 shadow-2xl shadow-[#063f58]/20 backdrop-blur-md">
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

      <div className="relative flex items-center justify-center bg-[#fbfcfd] p-6 sm:p-10 lg:p-14">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-petrobras-blue via-petrobras-green to-petrobras-yellow lg:hidden" />

        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
            <LogoMark className="size-10" />
            <span className="font-semibold tracking-tight">SIGAC</span>
            <span className="text-[10px] text-white">Sistema de Gestão de Acesso ao Armazenamento Científico</span>
          </div>

          <div className="mb-6 hidden flex-col gap-2 lg:flex">
            <span className="h-1 w-12 rounded-full bg-petrobras-yellow" />
            <h1 className="text-3xl font-semibold tracking-tight text-[#09263d]">Acesse sua conta</h1>
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
