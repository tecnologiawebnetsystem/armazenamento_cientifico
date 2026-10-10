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
    <main className="light relative grid min-h-svh overflow-hidden bg-[#f3f6f8] text-foreground lg:grid-cols-[61%_39%]">
      <section aria-labelledby="sigac-hero-title" className="relative flex min-h-[560px] flex-col justify-between overflow-hidden bg-[#07345d] px-6 py-8 text-white sm:px-10 lg:min-h-svh lg:px-[clamp(3rem,6.25vw,7.5rem)] lg:py-14">
        <Image src="/images/login-hero.png" alt="" fill priority className="pointer-events-none object-cover opacity-20 mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(4,39,77,0.98)_0%,rgba(7,61,112,0.94)_58%,rgba(12,76,133,0.78)_100%)]" />
        <div className="absolute -right-[17%] -top-[8%] z-10 hidden h-[118%] w-[35%] rotate-[8deg] rounded-[50%] bg-[#f3f6f8] lg:block" />
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-petrobras-yellow via-petrobras-yellow to-petrobras-green" />
        <div className="relative z-10 flex items-center gap-4">
          <LogoFull className="h-12 w-56" />
          <div className="hidden border-l border-white/30 pl-4 sm:flex sm:flex-col sm:leading-tight">
            <span className="font-semibold tracking-[0.14em]">SIGAC</span>
            <span className="max-w-[18rem] text-[10px] leading-4 text-white/75">Sistema de Gestão de Acesso ao Armazenamento Científico</span>
          </div>
        </div>
        <div className="relative z-10 max-w-2xl py-10 lg:translate-y-0 lg:py-0">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-petrobras-yellow/40 bg-petrobras-yellow/10 px-3 py-1.5 text-xs font-medium tracking-wide text-petrobras-yellow">
            <span className="size-1.5 rounded-full bg-petrobras-yellow" /> Plataforma corporativa Petrobras
          </span>
          <h1 id="sigac-hero-title" className="max-w-2xl text-[clamp(2.35rem,4.2vw,4.3rem)] leading-[1.08] font-semibold tracking-[-0.045em] text-balance">
            Organize, arquive e compartilhe os dados científicos de cada área de rede com <span className="text-petrobras-yellow">segurança e rastreabilidade</span>.
          </h1>
          <p className="mt-6 text-base leading-7 text-white/75 sm:text-lg">Gestão de dados de pesquisa e desenvolvimento</p>
          <div className="mt-10 grid gap-4 border-t border-white/20 pt-6 sm:grid-cols-2">
            <div className="flex items-center gap-3 text-sm text-white/85"><span className="flex size-9 items-center justify-center rounded-lg bg-petrobras-yellow/15 text-petrobras-yellow"><span className="size-2 rounded-full bg-petrobras-yellow" /></span><span>Controle de acesso por perfil</span></div>
            <div className="flex items-center gap-3 text-sm text-white/85"><span className="flex size-9 items-center justify-center rounded-lg bg-petrobras-yellow/15 text-petrobras-yellow"><span className="size-2 rounded-full bg-petrobras-yellow" /></span><span>Trilha de auditoria completa</span></div>
          </div>
        </div>
      </section>
      <section aria-labelledby="login-title" className="relative flex flex-col items-center justify-center overflow-hidden bg-[#f3f6f8] px-5 py-10 sm:px-10 lg:px-16">
        <div className="relative z-20 w-full max-w-[31.5rem]">
          <div className="mb-4 flex items-center justify-end gap-4 text-sm font-medium text-[#1b5a91]" aria-label="Status de segurança">
            <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-petrobras-green" /> Sistema seguro</span>
            <span className="h-5 w-px bg-[#c8d6e5]" aria-hidden="true" />
            <span>Acesso restrito</span>
          </div>
          <div className="overflow-hidden rounded-[1.35rem] border border-[#d6e0ea] bg-white shadow-[0_18px_48px_rgba(30,65,100,0.10)]">
            <div className="h-1.5 bg-gradient-to-r from-petrobras-green via-petrobras-green to-petrobras-yellow" />
            <div className="px-7 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
              <div className="mb-10 flex items-center gap-4"><LogoFull className="h-12 w-56" /><span className="sr-only">SIGAC Petrobras</span></div>
              <div className="mb-9 flex flex-col gap-3"><h2 id="login-title" className="max-w-sm text-3xl font-semibold tracking-tight text-[#092e57] sm:text-[2.65rem] sm:leading-[1.08]">Acesse sua conta</h2><p className="max-w-md text-base leading-7 text-[#66809d]">Entre no SIGAC para consultar suas áreas de rede, mapas de acesso e permissões.</p></div>
              <LoginForm authError={authError} nextPath={nextPath} />
            </div>
          </div>
          <footer className="pt-7 text-center text-xs text-[#66809d]">SIGAC · Petrobras <span className="px-2">|</span> Acesso corporativo seguro</footer>
        </div>
      </section>
    </main>
  )
}
