import { ArrowLeft, Database, Info, Layers3, ShieldCheck } from 'lucide-react'
import { ProjectForm } from '@/components/project-form'

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Database className="size-5" /></div><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Armazenamento científico</p><p className="text-sm font-semibold">Administração de projetos</p></div></div>
          <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><ShieldCheck className="size-4" /> Ambiente seguro</span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
        <button type="button" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" /> Voltar para projetos</button>
        <div className="mb-10 flex flex-col gap-4 border-b border-border pb-8 md:flex-row md:items-end md:justify-between"><div><p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">Novo cadastro</p><h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">Criar novo projeto</h1><p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">Registre as informações do projeto e defina os acessos que serão aplicados ao armazenamento científico.</p></div><div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"><Layers3 className="size-4" /> Campos obrigatórios marcados com <span className="font-semibold text-destructive">*</span></div></div>
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]" aria-label="Cadastro de projeto"><div className="rounded-lg border border-border bg-card p-6 shadow-sm md:p-8"><ProjectForm /></div><aside className="hidden lg:block"><div className="sticky top-8 flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Info className="size-4 text-primary" /> Sobre este cadastro</div><p className="text-sm leading-6 text-muted-foreground">O código do projeto será usado como identificador único em consultas e integrações.</p><div className="h-px bg-border" /><p className="text-xs leading-5 text-muted-foreground">Os grupos e roles podem ser revisados posteriormente por um administrador.</p></div></aside></section>
      </div>
    </main>
  )
}
