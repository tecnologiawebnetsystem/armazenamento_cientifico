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
    <main className="light relative grid min-h-svh overflow-hidden bg-[#f4f7f6] text-foreground lg:grid-cols-[minmax(0,1.12fr)_minmax(500px,0.88fr)]">
      <Image src="/images/login-hero.png" alt="" fill priority className="pointer-events-none object-cover opacity-[0.08] mix-blend-multiply" />
      <section aria-labelledby="sigac-hero-title" className="relative flex min-h-[520px] flex-col justify-between overflow-hidden bg-[#063f58] px-6 py-8 text-white sm:px-10 lg:min-h-svh lg:px-[clamp(3rem,8vw,8rem)] lg:py-14">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,63,88,0.98)_0%,rgba(0,127,62,0.94)_70%,rgba(0,92,50,0.98)_100%)]" />
        <div className="absolute inset-0 opacity-[0.1] [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="absolute -right-28 bottom-[-8rem] size-[28rem] rounded-full border-[36px] border-petrobras-yellow/15" />
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
      <section aria-labelledby="login-title" className="relative flex flex-col items-center justify-center overflow-hidden bg-[#f4f7f6] px-5 py-10 sm:px-10 lg:px-16">
        <div className="relative w-full max-w-[31.5rem]">
          <div className="mb-4 flex items-center justify-end gap-4 text-sm font-medium text-[#31577f]" aria-label="Status de segurança">
            <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-petrobras-green" /> Sistema seguro</span>
            <span className="h-5 w-px bg-[#c8d6e5]" aria-hidden="true" />
            <span>Acesso restrito</span>
          </div>
          <div className="overflow-hidden rounded-[1.35rem] border border-[#d6e0ea] bg-white shadow-[0_18px_48px_rgba(30,65,100,0.10)]">
            <div className="h-1.5 bg-gradient-to-r from-petrobras-green via-petrobras-green to-petrobras-yellow" />
            <div className="px-7 py-8 sm:px-10 sm:py-10">
              <div className="mb-10 flex items-center gap-4"><LogoFull className="h-12 w-56" /><span className="sr-only">SIGAC Petrobras</span></div>
              <div className="mb-8 flex flex-col gap-3"><h2 id="login-title" className="max-w-sm text-3xl font-semibold tracking-tight text-[#063f58] sm:text-4xl">Acesse sua conta</h2><p className="max-w-md text-base leading-7 text-[#66809d]">Entre no SIGAC para consultar suas áreas de rede, mapas de acesso e permissões.</p></div>
              <LoginForm authError={authError} nextPath={nextPath} />
            </div>
          </div>
          <footer className="pt-7 text-center text-xs text-[#66809d]">SIGAC · Petrobras <span className="px-2">|</span> Acesso corporativo seguro</footer>
        </div>
      </section>
    </main>
  )
}
