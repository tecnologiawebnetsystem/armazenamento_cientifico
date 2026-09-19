import Link from "next/link"
import { ActivityIcon, ArrowRightIcon, DatabaseIcon, FolderKanbanIcon, MapIcon, ShieldAlertIcon, UsersIcon } from "lucide-react"
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
  solicitante: { label: "Acesso ao repositório", description: "Consulte as informações disponíveis para o seu escopo.", focus: "Consulta" },
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
}

export function ExecutiveDashboard({ role, projects, totalMembros, totalMapas, armazenamentoMb, pendencias, activity, consultedAt }: Props) {
  const view = profileView[role]
  const activeProjects = projects.filter((project) => project.status === "ativo").length
  const attention = projects.filter((project) => project.status === "suspenso").length
  const featuredProjects = projects.filter((project) => project.status === "ativo").slice(0, 3)

  const indicators = [
    { label: "Projetos ativos", value: activeProjects, icon: FolderKanbanIcon, href: "/projetos" },
    { label: role === "auditor" ? "Mapas de acesso" : "Pessoas no escopo", value: role === "auditor" ? totalMapas : totalMembros, icon: role === "auditor" ? MapIcon : UsersIcon, href: role === "auditor" ? "/pesquisas" : "/projetos" },
    { label: "Armazenamento", value: formatStorage(armazenamentoMb), icon: DatabaseIcon, href: "/projetos" },
  ]

  return (
    <div className="sw-motion flex flex-col gap-6">
      <header className="sigac-grid flex flex-col gap-2 rounded-2xl border border-petrobras-green/30 bg-card p-6 shadow-lg shadow-petrobras-blue/8 sigac-surface sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">SIGAC · {view.focus}</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">{view.label}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{view.description}</p>
      </header>

      <section aria-label="Indicadores essenciais" className="grid gap-3 sm:grid-cols-3">
        {indicators.map((item) => (
          <Link key={item.label} href={item.href} className="group">
            <Card className="sigac-surface h-full border-0 ring-1 ring-border/70 transition-all hover:-translate-y-0.5 hover:ring-petrobras-green/50">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-petrobras-green/12 text-petrobras-green ring-1 ring-inset ring-petrobras-green/20"><item.icon className="size-5" /></span>
                <span className="min-w-0 flex-1"><strong className="block font-heading text-2xl tracking-tight">{item.value}</strong><span className="text-xs text-muted-foreground">{item.label}</span></span>
                <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <p className="text-xs text-muted-foreground">Dados consultados em {formatActivityDate(consultedAt)} · Fonte: banco de dados</p>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card className="sigac-surface border-0 ring-1 ring-border/70">
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><h2 className="font-heading text-lg font-semibold">Projetos em destaque</h2><p className="mt-1 text-sm text-muted-foreground">Acesso rápido ao que está em operação.</p></div><FolderKanbanIcon className="size-5 text-primary" /></div>
            {featuredProjects.length ? <div className="flex flex-col gap-2">{featuredProjects.map((project) => <Link key={project.id} href={`/projetos/${project.id}`} className="flex items-center justify-between gap-4 rounded-lg border border-border/70 px-3 py-3 transition-colors hover:bg-muted/50"><span className="min-w-0 truncate text-sm font-medium">{project.nome}</span><Badge variant="outline">Ativo</Badge></Link>)}</div> : <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Nenhum projeto ativo no seu escopo.</p>}
          </CardContent>
        </Card>
        <Card className="sigac-surface border-0 ring-1 ring-border/70">
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6"><div><h2 className="font-heading text-lg font-semibold">Próxima atenção</h2><p className="mt-1 text-sm text-muted-foreground">Somente o que pode exigir uma ação.</p></div><div className="flex flex-col gap-3"><div className="flex items-center justify-between rounded-lg bg-muted/40 p-3"><span className="text-sm">Pendências de acesso</span><strong className="font-heading text-xl">{pendencias}</strong></div><div className="flex items-center justify-between rounded-lg bg-muted/40 p-3"><span className="text-sm">Projetos suspensos</span><strong className="font-heading text-xl">{attention}</strong></div></div></CardContent>
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
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><h2 className="font-heading text-lg font-semibold">Atividade recente</h2><p className="mt-1 text-sm text-muted-foreground">Últimos eventos registrados na plataforma.</p></div><ActivityIcon className="size-5 text-primary" /></div>
            {activity.length ? <div className="flex flex-col gap-2">{activity.slice(0, 5).map((item) => <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg border border-border/70 px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.detalhes || item.acao}</p><p className="mt-1 text-xs text-muted-foreground">{item.entidade} · {formatActivityDate(item.criadoEm)}</p></div><Badge variant={item.resultado === "erro" ? "destructive" : "outline"}>{item.resultado === "erro" ? "Erro" : "Sucesso"}</Badge></div>)}</div> : <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Ainda não há atividade registrada.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
