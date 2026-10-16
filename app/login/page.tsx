import Image from "next/image"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login/login-form"
import { LogoFull } from "@/components/brand/logo-mark"
import { getBackendSession } from "@/lib/session"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ auth_error?: string; error?: string; error_description?: string; message?: string; reason?: string; next?: string }> }) {
  const params = await searchParams
  const returnedError = params.auth_error || params.error_description || params.error || params.message || params.reason
  const user = await getBackendSession()
  const isSolicitante = user?.role === "solicitante" || user?.perfilNome?.toLowerCase().includes("solicitante")
  const authError = returnedError || (isSolicitante ? "Perfil Solicitante do CAV4 sem permissão" : undefined)
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard"
  if (user && !authError) redirect(nextPath)

  return (
    <main style={{ fontFamily: "Arial, sans-serif" }} className="light relative grid min-h-svh overflow-hidden bg-[#f5f8f7] text-foreground lg:grid-cols-[minmax(0,1.35fr)_minmax(500px,0.65fr)]">
      <section aria-labelledby="sigac-hero-title" className="relative flex min-h-[520px] flex-col justify-between overflow-hidden bg-[#005c32] px-6 py-8 text-white sm:px-10 lg:min-h-svh lg:px-[clamp(2.5rem,7vw,7.5rem)] lg:py-12 lg:[clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]">
        <Image src="/images/login-hero.png" alt="" fill priority sizes="(max-width: 1023px) 100vw, 58vw" className="pointer-events-none object-cover opacity-45 mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,92,50,0.96)_0%,rgba(0,127,62,0.84)_48%,rgba(0,59,36,0.72)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,59,36,0.18)_0%,rgba(0,59,36,0.08)_45%,rgba(0,31,20,0.72)_100%)]" />
        <div className="absolute -right-36 bottom-[-12rem] size-[34rem] rounded-full border-[44px] border-petrobras-yellow/20" />
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#fdbb30]" />
        <div className="relative z-10 flex items-center gap-4">
          <LogoFull className="h-12 w-56" />
          <div className="hidden border-l border-white/30 pl-4 sm:flex sm:flex-col sm:leading-tight">
            <span className="font-semibold tracking-[0.14em]">SIGAC</span>
            <span className="max-w-[18rem] text-[10px] leading-4 text-white/75">Sistema de Gestão de Acesso ao Armazenamento Científico</span>
          </div>
        </div>
        <div className="relative z-10 max-w-2xl py-10 lg:translate-y-0 lg:py-0 lg:pr-16">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-petrobras-yellow/40 bg-petrobras-yellow/10 px-3 py-1.5 text-xs font-medium tracking-wide text-petrobras-yellow">
            <span className="size-1.5 rounded-full bg-petrobras-yellow" /> Plataforma corporativa Petrobras
          </span>
          <h1 id="sigac-hero-title" className="max-w-2xl text-[clamp(2.35rem,4.4vw,4.5rem)] leading-[1.06] font-semibold tracking-[-0.04em] text-balance">
            Organize, arquive e compartilhe os dados científicos de cada área de rede com <span className="text-petrobras-yellow">segurança e rastreabilidade</span>.
          </h1>
          <p className="mt-6 text-base leading-7 text-white/75 sm:text-lg">Gestão de dados de pesquisa e desenvolvimento</p>
          <div className="mt-10 grid gap-4 border-t border-white/20 pt-6 sm:grid-cols-2">
            <div className="flex items-center gap-3 text-sm text-white/85"><span className="flex size-9 items-center justify-center rounded-lg bg-petrobras-yellow/15 text-petrobras-yellow"><span className="size-2 rounded-full bg-petrobras-yellow" /></span><span>Controle de acesso por perfil</span></div>
            <div className="flex items-center gap-3 text-sm text-white/85"><span className="flex size-9 items-center justify-center rounded-lg bg-petrobras-yellow/15 text-petrobras-yellow"><span className="size-2 rounded-full bg-petrobras-yellow" /></span><span>Trilha de auditoria completa</span></div>
          </div>
        </div>
      </section>
      <section aria-labelledby="login-title" className="relative flex items-center justify-center overflow-hidden bg-[#f5f8f7] px-5 py-12 sm:px-10 lg:px-16">
        <div className="absolute inset-x-0 top-0 h-px bg-[#d8e6df] lg:inset-y-0 lg:left-0 lg:h-auto lg:w-px" />
        <div className="pointer-events-none absolute -right-28 -top-28 size-72 rounded-full border-[24px] border-petrobras-yellow/15" />
        <div className="pointer-events-none absolute -bottom-32 -left-28 size-80 rounded-full border-[34px] border-petrobras-green/10" />
        <div className="relative w-full max-w-[31rem] lg:-ml-8">
          <div className="mb-8 flex flex-col gap-3 lg:hidden"><LogoFull className="h-11 w-52" /><span className="text-sm font-semibold tracking-wide text-[#063f58]">SIGAC · Petrobras</span></div>
          <div className="mb-8 flex flex-col gap-3"><span className="h-1 w-14 rounded-full bg-petrobras-yellow" /><h2 id="login-title" className="text-[2.35rem] font-semibold leading-tight tracking-[-0.04em] text-[#063f58]">Acesse sua conta</h2><p className="max-w-md text-sm leading-6 text-muted-foreground">Entre no SIGAC para consultar suas áreas de rede, mapas de acesso e permissões.</p></div>
          <LoginForm authError={authError} nextPath={nextPath} />
        </div>
      </section>
    </main>
  )
}
