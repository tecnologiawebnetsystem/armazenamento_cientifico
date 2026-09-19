import Image from "next/image"
import { LoginForm } from "@/components/login/login-form"
import { LogoFull } from "@/components/brand/logo-mark"

export default function LoginPage() {
  return (
    <div className="light relative grid min-h-svh overflow-hidden bg-[linear-gradient(112deg,#063f58_0%,#075b70_24%,#087d69_48%,#008f5a_70%,#006b3f_100%)] text-foreground lg:grid-cols-[1.1fr_1fr]">
      <Image
        src="/images/login-hero.png"
        alt=""
        fill
        priority
        className="pointer-events-none object-cover opacity-[0.06] mix-blend-screen"
      />
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        {/* Camadas de cor da marca: verde profundo + brilho verde/amarelo */}
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-petrobras-blue/35 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-petrobras-green/35 blur-3xl" />
        {/* Faixa superior verde/amarelo (identidade Petrobras) */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-petrobras-yellow via-petrobras-yellow to-petrobras-green" />

        <div className="relative z-10 flex items-center gap-3 text-sidebar-foreground">
          <LogoFull className="h-11 w-52" />
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

      <div className="relative flex items-center justify-center overflow-hidden p-4 sm:p-8 lg:p-12">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border-[28px] border-petrobras-yellow/20" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 size-80 rounded-full border-[34px] border-petrobras-green/35" />
        <div className="absolute inset-x-0 bottom-0 h-2 bg-petrobras-yellow" />

        <div className="relative w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-2 text-center lg:hidden">
            <LogoFull className="h-11 w-52" />
            <span className="font-semibold tracking-tight text-white">SIGAC</span>
            <span className="text-[10px] text-white/75">Sistema de Gestão de Acesso ao Armazenamento Científico</span>
          </div>

          <div className="mb-6 flex flex-col gap-2 text-center lg:text-left">
            <span className="mx-auto h-1 w-12 rounded-full bg-petrobras-yellow lg:mx-0" />
            <h1 className="text-3xl font-semibold tracking-tight text-white">Acesse sua conta</h1>
            <p className="text-sm leading-6 text-white/75">
              Entre no SIGAC para consultar seus projetos, pesquisas e permissões.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
