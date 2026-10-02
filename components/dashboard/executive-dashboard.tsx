import Link from "next/link"
import { ActivityIcon, ArrowRightIcon, DatabaseIcon, FolderKanbanIcon, MapIcon, PlusIcon, ShieldAlertIcon, UsersIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ActivityLog, Project, Role } from "@/lib/types"

interface Props {
  role: Role
  projects: Project[]
  totalMembros: number
  totalMapas: number
  armazenamentoMb: number
  pendencias: number
  activity: ActivityLog[]
  consultedAt: string
}

function formatStorage(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`
}

const profileView: Record<Role, { label: string; description: string; focus: string }> = {
  admin: { label: "Governança da plataforma", description: "Visão essencial do ambiente e do portfólio sob administração.", focus: "Controle geral" },
  gerente: { label: "Operação dos projetos", description: "Acompanhe os projetos e acessos que precisam da sua atenção.", focus: "Acompanhamento" },
  patrocinador: { label: "Acompanhamento executivo", description: "Consulte o andamento e o alcance dos projetos patrocinados.", focus: "Visão executiva" },
  auditor: { label: "Conformidade e rastreabilidade", description: "Consulte o escopo auditável e os mapas de acesso registrados.", focus: "Conformidade" },
  operador: { label: "Configurações da plataforma", description: "Acesse as configurações e os recursos administrativos do ambiente.", focus: "Administração" },
  solicitante: { label: "Acesso ao repositório", description: "Consulte as informações disponíveis para o seu escopo.", focus: "Consulta" },
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
}

export function ExecutiveDashboard({ role, projects, totalMembros, totalMapas, armazenamentoMb, pendencias, activity, consultedAt }: Props) {
  const view = profileView[role] ?? profileView.solicitante
  const activeProjects = projects.filter((project) => project.status === "ativo").length
  const attention = projects.filter((project) => project.status === "suspenso").length
  const featuredProjects = projects.filter((project) => project.status === "ativo").slice(0, 3)

  const indicators = [
    { label: "Projetos ativos", value: activeProjects, icon: FolderKanbanIcon, href: "/projetos" },
    { label: role === "auditor" ? "Mapas de acesso" : "Pessoas no escopo", value: role === "auditor" ? totalMapas : totalMembros, icon: role === "auditor" ? MapIcon : UsersIcon, href: role === "auditor" ? "/pesquisas" : "/projetos" },
    { label: "Armazenamento", value: formatStorage(armazenamentoMb), icon: DatabaseIcon, href: "/projetos" },
  ]

  return (
    <div className="sw-motion flex flex-col gap-8">
      <header className="sigac-grid sigac-surface relative isolate overflow-hidden rounded-2xl border-l-4 border-l-primary p-6 sm:p-8 lg:p-10">
        <div className="relative flex max-w-3xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/8 px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-primary uppercase"><span className="size-1.5 rounded-full bg-primary" />SIGAC</span>
            <span className="h-4 w-px bg-border" />
            <span className="text-xs font-medium text-muted-foreground">{view.focus}</span>
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl lg:text-[2.65rem]">{view.label}</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{view.description}</p>
          </div>
        </div>
      </header>

      <section aria-label="Ações rápidas" className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/70 p-3">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">Comece por aqui</span>
        <Link href="/projetos" className="sigac-focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"><FolderKanbanIcon className="size-4 text-primary" />Consultar projetos</Link>
        {role === "admin" || role === "gerente" ? <Link href="/projetos/novo" className="sigac-focus-ring inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/8 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15"><PlusIcon className="size-4" />Criar projeto</Link> : null}
        <Link href={role === "auditor" ? "/logs" : "/pesquisas"} className="sigac-focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"><ActivityIcon className="size-4 text-primary" />{role === "auditor" ? "Consultar auditoria" : "Consultar acessos"}</Link>
      </section>

      <section aria-label="Indicadores essenciais" className="grid gap-3 sm:grid-cols-3">
        {indicators.map((item) => (
          <Link key={item.label} href={item.href} className="group">
            <Card className="sigac-surface h-full border-0 ring-1 ring-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:ring-petrobras-green/50 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5 sm:p-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrobras-green/10 text-petrobras-green ring-1 ring-inset ring-petrobras-green/20"><item.icon className="size-5" /></span>
                <span className="min-w-0 flex-1"><strong className="block font-heading text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{item.value}</strong><span className="mt-1 block text-xs text-muted-foreground">{item.label}</span><span className="mt-3 block h-1 w-16 rounded-full bg-petrobras-green/20"><span className="block h-full w-2/3 rounded-full bg-petrobras-green/70" /></span></span>
                <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <p className="text-xs text-muted-foreground">Dados consultados em {formatActivityDate(consultedAt)} · Fonte: banco de dados</p>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card className="sigac-surface border-0 ring-1 ring-border/70">
          <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase">Portfólio</p><h2 className="mt-1 font-heading text-lg font-semibold">Projetos em destaque</h2><p className="mt-1 text-sm text-muted-foreground">Acesso rápido ao que está em operação.</p></div><span className="flex size-9 items-center justify-center rounded-lg bg-muted/60 text-primary"><FolderKanbanIcon className="size-4" /></span></div>
            {featuredProjects.length ? <div className="divide-y divide-border/70 rounded-lg border border-border/70">{featuredProjects.map((project) => <Link key={project.id} href={`/projetos/${project.id}`} className="flex items-center justify-between gap-4 px-3.5 py-3 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted/50"><span className="flex min-w-0 items-center gap-2.5 truncate text-sm font-medium"><span className="size-1.5 shrink-0 rounded-full bg-petrobras-green" />{project.nome}</span><Badge variant="outline" className="border-petrobras-green/25 text-petrobras-green">Ativo</Badge></Link>)}</div> : <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Nenhum projeto ativo no seu escopo.</p>}
          </CardContent>
        </Card>
        <Card className="sigac-surface border-0 ring-1 ring-border/70">
          <CardContent className="flex flex-col gap-5 p-5 sm:p-6"><div><p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase">Prioridades</p><h2 className="mt-1 font-heading text-lg font-semibold">Próxima atenção</h2><p className="mt-1 text-sm text-muted-foreground">Somente o que pode exigir uma ação.</p></div><div className="flex flex-col gap-2.5"><div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 p-3.5"><span className="flex items-center gap-2 text-sm"><span className="size-2 rounded-full bg-petrobras-yellow" />Pendências de acesso</span><strong className="font-heading text-xl">{pendencias}</strong></div><div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 p-3.5"><span className="flex items-center gap-2 text-sm"><span className="size-2 rounded-full bg-muted-foreground/50" />Projetos suspensos</span><strong className="font-heading text-xl">{attention}</strong></div></div></CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <Card className="sigac-surface border-0 ring-1 ring-border/70">
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><h2 className="font-heading text-lg font-semibold">Saúde do ambiente</h2><p className="mt-1 text-sm text-muted-foreground">Sinais que ajudam a priorizar a operação.</p></div><ShieldAlertIcon className="size-5 text-primary" /></div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3"><span>Projetos ativos</span><strong>{activeProjects} de {projects.length}</strong></div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3"><span>Solicitações pendentes</span><strong className={pendencias > 0 ? "text-amber-700" : "text-emerald-700"}>{pendencias}</strong></div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3"><span>Projetos suspensos</span><strong className={attention > 0 ? "text-red-700" : "text-emerald-700"}>{attention}</strong></div>
            </div>
          </CardContent>
        </Card>
        <Card className="sigac-surface border-0 ring-1 ring-border/70">
          <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.16em] text-primary uppercase">Rastreabilidade</p><h2 className="mt-1 font-heading text-lg font-semibold">Atividade recente</h2><p className="mt-1 text-sm text-muted-foreground">Últimos eventos registrados na plataforma.</p></div><span className="flex size-9 items-center justify-center rounded-lg bg-muted/60 text-primary"><ActivityIcon className="size-4" /></span></div>
            {activity.length ? <div className="relative flex flex-col gap-0 pl-4 before:absolute before:bottom-3 before:left-[3px] before:top-3 before:w-px before:bg-border">{activity.slice(0, 5).map((item) => <div key={item.id} className="relative flex items-start justify-between gap-4 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0"><span className="absolute -left-[1.05rem] top-4 size-2 rounded-full border-2 border-card bg-petrobras-green ring-1 ring-petrobras-green/30" /><div className="min-w-0"><p className="truncate text-sm font-medium">{item.detalhes || item.acao}</p><p className="mt-1 text-xs text-muted-foreground">{item.entidade} · {formatActivityDate(item.criadoEm)}</p></div><Badge variant={item.resultado === "erro" ? "destructive" : "outline"} className="shrink-0">{item.resultado === "erro" ? "Erro" : "Sucesso"}</Badge></div>)}</div> : <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Ainda não há atividade registrada.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
