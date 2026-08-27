import Link from "next/link"
import {
  DatabaseIcon,
  FolderKanbanIcon,
  GaugeIcon,
  MapIcon,
  UsersIcon,
  PlusIcon,
  FileBarChartIcon,
  ArrowRightIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ActivityLog, Project } from "@/lib/types"

interface Props {
  projects: Project[]
  totalMembros: number
  totalMapas: number
  armazenamentoMb: number
  pendencias: number
  activity?: ActivityLog[]
  source?: "database"
  consultedAt?: string
}

function formatStorage(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`
}

export function ExecutiveDashboard({ projects, totalMembros, totalMapas, armazenamentoMb, pendencias, activity = [], source = "database", consultedAt }: Props) {
  const ativos = projects.filter((project) => project.status === "ativo").length
  const concluidos = projects.filter((project) => project.status === "concluido").length
  const suspensos = projects.filter((project) => project.status === "suspenso").length
  const total = Math.max(projects.length, 1)

  const areas = Array.from(new Set(projects.map((project) => project.areaResponsavel))).filter(Boolean).slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-xl border border-primary/15 bg-primary/[0.04] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">SIGAC · visão executiva</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">Portfólio científico em foco</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Acompanhe projetos, acessos e capacidade de armazenamento em um único panorama operacional.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/projetos?novo=1" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"><PlusIcon data-icon="inline-start" />Novo projeto</Link>
         
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Projetos no escopo", value: projects.length, icon: FolderKanbanIcon, note: `${ativos} em operação` },
          { label: "Mapas e conjuntos", value: totalMapas, icon: MapIcon, note: "acesso autorizado" },
          { label: "Armazenamento", value: formatStorage(armazenamentoMb), icon: DatabaseIcon, note: "uso consolidado" },
          { label: "Membros envolvidos", value: totalMembros, icon: UsersIcon, note: pendencias ? `${pendencias} pendência(s)` : "sem pendências" },
        ].map((item, index) => (
          <Card
            key={item.label}
            className={`border-0 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${[
              "!bg-petrobras-green/10 ring-petrobras-green/30",
              "!bg-petrobras-blue/10 ring-petrobras-blue/30",
              "!bg-petrobras-teal/10 ring-petrobras-teal/30",
              "!bg-petrobras-yellow/15 ring-petrobras-yellow/40",
            ][index]}`}
          >
            <CardContent className="flex min-h-32 flex-col justify-between gap-4 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className={`flex size-9 items-center justify-center rounded-lg shadow-sm ring-1 ring-inset ${[
                  "bg-petrobras-green/15 text-petrobras-green ring-petrobras-green/20",
                  "bg-petrobras-blue/15 text-petrobras-blue ring-petrobras-blue/20",
                  "bg-petrobras-teal/15 text-petrobras-teal ring-petrobras-teal/20",
                  "bg-petrobras-yellow/25 text-accent-foreground ring-petrobras-yellow/30",
                ][index]}`}><item.icon className="size-5" /></span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Portfólio</span>
              </div>
              <div className="flex flex-col gap-1">
                <strong className="font-heading text-2xl tracking-tight sm:text-3xl">{item.value}</strong>
                <span className="truncate text-xs text-muted-foreground">{item.label} · {item.note}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-primary/15 bg-primary/[0.03] px-4 py-3 text-sm"><span className="text-muted-foreground">Fonte dos indicadores: <strong className="text-foreground">{source === "database" ? "banco de dados" : source}</strong></span>{consultedAt && <span className="text-xs text-muted-foreground">Consultado em {new Date(consultedAt).toLocaleString("pt-BR")}</span>}</div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm ring-1 ring-border/70">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1"><CardTitle>Radar do portfólio</CardTitle><p className="text-sm text-muted-foreground">Distribuição atual dos projetos visíveis para você.</p></div>
              <GaugeIcon className="size-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 p-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-label={`${ativos} projetos ativos de ${projects.length}`}>
              <span className="bg-chart-2" style={{ width: `${(ativos / total) * 100}%` }} />
              <span className="bg-chart-4" style={{ width: `${(concluidos / total) * 100}%` }} />
              <span className="bg-chart-5" style={{ width: `${(suspensos / total) * 100}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[{ label: "Em operação", value: ativos, tone: "bg-chart-2" }, { label: "Concluídos", value: concluidos, tone: "bg-chart-4" }, { label: "Em atenção", value: suspensos, tone: "bg-chart-5" }].map((item) => <div key={item.label} className="flex flex-col gap-2"><span className="flex items-center gap-2 text-xs text-muted-foreground"><i className={`size-2 rounded-full ${item.tone}`} />{item.label}</span><strong className="font-heading text-2xl">{item.value}</strong></div>)}
            </div>
            <div className="flex flex-col gap-2">
              {projects.slice(0, 3).map((project) => <Link key={project.id} href={`/projetos/${project.id}`} className="flex items-center justify-between gap-4 rounded-lg border border-border/70 px-3 py-3 transition-colors hover:bg-muted/50"><span className="min-w-0 truncate text-sm font-medium">{project.nome}</span><Badge variant="outline">{project.status}</Badge></Link>)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-border/70">
          <CardHeader className="border-b bg-muted/20 pb-4"><CardTitle>Distribuição por área</CardTitle><p className="text-sm text-muted-foreground">Onde o portfólio está concentrado.</p></CardHeader>
          <CardContent className="flex flex-col gap-4 p-5">
            {areas.map((area) => { const count = projects.filter((project) => project.areaResponsavel === area).length; return <Link key={area} href={`/projetos?area=${encodeURIComponent(area)}`} className="group flex items-center justify-between gap-3"><span className="truncate text-sm font-medium">{area}</span><span className="flex items-center gap-2 text-sm text-muted-foreground"><Badge variant="secondary">{count}</Badge><ArrowRightIcon className="size-4 opacity-0 transition-opacity group-hover:opacity-100" /></span></Link> })}
            {!areas.length && <p className="text-sm text-muted-foreground">Nenhuma área disponível no seu escopo.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border/70"><CardHeader className="border-b bg-muted/20 pb-4"><CardTitle>Atividade recente</CardTitle><p className="text-sm text-muted-foreground">Eventos registrados pela API no banco de dados.</p></CardHeader><CardContent className="flex flex-col gap-2 p-5">{activity.length ? activity.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-3"><span className="truncate text-sm font-medium">{item.detalhes || item.acao}</span><Badge variant="outline">{item.entidade}</Badge></div>) : <p className="text-sm text-muted-foreground">Nenhuma atividade registrada no escopo atual.</p>}</CardContent></Card>
    </div>
  )
}
