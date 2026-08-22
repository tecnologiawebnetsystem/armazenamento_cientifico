'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Database,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { ProjectForm } from '@/components/project-form'

type View = 'dashboard' | 'new-project'

type Role = 'Administradora' | 'Gerente'

export default function Page() {
  const [authenticated, setAuthenticated] = useState(false)
  const [view, setView] = useState<View>('dashboard')
  const [role, setRole] = useState<Role>('Administradora')
  const [menuOpen, setMenuOpen] = useState(false)

  if (!authenticated) {
    return <LoginScreen onLogin={(selectedRole) => { setRole(selectedRole); setAuthenticated(true) }} />
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3"><button type="button" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)} className="rounded-md p-2 hover:bg-muted lg:hidden">{menuOpen ? <X /> : <Menu />}</button><div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Database className="size-5" /></div><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Armazenamento científico</p><p className="text-sm font-semibold">Administração de projetos</p></div></div>
          <div className="flex items-center gap-4"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">Patrícia Silva</p><p className="text-xs text-muted-foreground">{role}</p></div><button type="button" onClick={() => setAuthenticated(false)} aria-label="Sair" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4" /></button></div>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className={`${menuOpen ? 'block' : 'hidden'} absolute inset-x-0 top-16 z-10 border-b border-border bg-card p-4 lg:static lg:block lg:w-64 lg:border-b-0 lg:border-r lg:p-5`}>
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menu principal</p>
          <nav className="flex flex-col gap-1"><button type="button" onClick={() => { setView('dashboard'); setMenuOpen(false) }} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${view === 'dashboard' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><LayoutDashboard className="size-4" /> Visão geral</button><button type="button" onClick={() => { setView('new-project'); setMenuOpen(false) }} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${view === 'new-project' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><FolderKanban className="size-4" /> Projetos</button><button type="button" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><Users className="size-4" /> Usuários e perfis</button></nav>
          <div className="mt-auto hidden border-t border-border pt-5 lg:mt-10 lg:block"><div className="flex items-center gap-2 px-3 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Ambiente seguro</div></div>
        </aside>
        <main className="min-w-0 flex-1">
          {view === 'dashboard' ? <Dashboard onNewProject={() => setView('new-project')} /> : <NewProject onBack={() => setView('dashboard')} />}
        </main>
      </div>
    </div>
  )
}

function LoginScreen({ onLogin }: { onLogin: (role: Role) => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10"><section className="w-full max-w-md rounded-xl border border-border bg-card p-7 shadow-sm sm:p-9"><div className="mb-8 flex flex-col items-center text-center"><div className="mb-5 flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Database className="size-7" /></div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">Armazenamento científico</p><h1 className="mt-3 text-2xl font-semibold tracking-tight">Acesse sua conta</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Entre para administrar projetos e permissões.</p></div><form className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); onLogin('Administradora') }}><div className="flex flex-col gap-2"><label htmlFor="email" className="text-sm font-semibold">E-mail corporativo</label><input id="email" type="email" defaultValue="patricia.silva@empresa.com" required className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div><div className="flex flex-col gap-2"><label htmlFor="password" className="text-sm font-semibold">Senha</label><input id="password" type="password" defaultValue="password" required className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div><button type="submit" onClick={() => onLogin('Administradora')} className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">Entrar <ChevronRight className="size-4" /></button></form><p className="mt-6 text-center text-xs text-muted-foreground">Acesso demonstrativo para administradores e gerentes</p></section></main>
}

function Dashboard({ onNewProject }: { onNewProject: () => void }) { return <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">Visão geral</p><h1 className="text-3xl font-semibold tracking-tight">Olá, Patrícia</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Gerencie os projetos e seus níveis de acesso.</p></div><button type="button" onClick={onNewProject} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"><Plus className="size-4" /> Novo projeto</button></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><Stat label="Projetos ativos" value="12" /><Stat label="Gestores cadastrados" value="08" /><Stat label="Pendências de acesso" value="03" /></div><section className="mt-8 rounded-lg border border-border bg-card p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Projetos recentes</h2><p className="mt-1 text-sm text-muted-foreground">Acompanhe os últimos cadastros.</p></div><button type="button" onClick={onNewProject} className="text-sm font-semibold text-primary hover:underline">Ver projetos</button></div><div className="mt-6 flex flex-col gap-3"><ProjectRow name="Plataforma de Dados Científicos" code="PDC-2025-001" area="Gerência de Dados" /><ProjectRow name="Acervo de Pesquisas Clínicas" code="APC-2025-004" area="Gerência de Pesquisa" /></div></section></div> }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div> }
function ProjectRow({ name, code, area }: { name: string; code: string; area: string }) { return <div className="flex flex-col gap-2 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{code}</p></div><span className="text-sm text-muted-foreground">{area}</span></div> }
function NewProject({ onBack }: { onBack: () => void }) { return <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12"><button type="button" onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Voltar para visão geral</button><div className="mb-10 border-b border-border pb-8"><p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">Novo cadastro</p><h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">Criar novo projeto</h1><p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">Registre as informações do projeto e defina os acessos que serão aplicados ao armazenamento científico.</p></div><section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-8"><ProjectForm /></section></div> }
