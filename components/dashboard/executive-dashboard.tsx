import Link from "next/link"
import {
  ArrowUpRightIcon,
  BarChart3Icon,
  CircleCheckIcon,
  DatabaseIcon,
  FolderKanbanIcon,
  GaugeIcon,
  MapIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Project, Role } from "@/lib/types"

interface Props {
  nome: string
  role: Role
  projects: Project[]
  totalMembros: number
  totalMapas: number
  armazenamentoMb: number
  pendencias: number
}

const roleLabels: Partial<Record<Role, string>> = {
  admin: "Governança da plataforma",
  patrocinador: "Visão executiva de portfólio",
  gerente: "Gestão operacional de projetos",
  auditor: "Conformidade e rastreabilidade",
}

function formatStorage(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`
}

export function ExecutiveDashboard({ nome, role, projects, totalMembros, totalMapas, armazenamentoMb, pendencias }: Props) {
  const ativos = projects.filter((project) => project.status === "ativo").length
  const concluidos = projects.filter((project) => project.status === "concluido").length
  const suspensos = projects.filter((project) => project.status === "suspenso").length
  const total = Math.max(projects.length, 1)
  const primeiroNome = nome.split(" ")[0]

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-lg sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
              <span className="flex size-2 rounded-full bg-chart-2" /> Centro de operações científicas
            </div>
            <h1 className="text-balance font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Bom dia, {primeiroNome}.
            </h1>
            <p className="max-w-xl text-sm leading-6 text-primary-foreground/75">
              {roleLabels[role] ?? "Acompanhamento de dados científicos"}. Tudo o que importa para sua operação, em uma única visão.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-4 py-3 backdrop-blur-sm">
            <ShieldCheckIcon className="size-5 text-chart-2" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-primary-foreground/60">Ambiente protegido</span>
              <span className="text-sm font-medium">Dados sincronizados</span>
            </div>
          </div>
        </div>
        <div className="absolute -right-16 -top-24 size-72 rounded-full border border-primary-foreground/10" />
        <div className="absolute -bottom-40 right-16 size-80 rounded-full border border-primary-foreground/10" />
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Projetos no escopo", value: projects.length, icon: FolderKanbanIcon, note: `${ativos} em operação` },
          { label: "Mapas e conjuntos", value: totalMapas, icon: MapIcon, note: "acesso autorizado" },
          { label: "Armazenamento", value: formatStorage(armazenamentoMb), icon: DatabaseIcon, note: "uso consolidado" },
          { label: "Membros envolvidos", value: totalMembros, icon: UsersIcon, note: pendencias ? `${pendencias} pendência(s)` : "sem pendências" },
        ].map((item) => (
          <Card key={item.label} className="border-0 shadow-sm ring-1 ring-border/70">
            <CardContent className="flex min-h-32 flex-col justify-between gap-4 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground"><item.icon className="size-5" /></span>
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

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
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

        <Card className="border-0 bg-secondary/30 shadow-sm ring-1 ring-border/70">
          <CardHeader><CardTitle>Próxima decisão</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BarChart3Icon className="size-6" /></div>
            <div className="flex flex-col gap-2"><h2 className="font-heading text-xl font-semibold">Leia o pulso do portfólio</h2><p className="text-sm leading-6 text-muted-foreground">Consulte tendências, status e distribuição por área para apoiar a próxima reunião de acompanhamento.</p></div>
            <Button render={<Link href="/relatorios" />} nativeButton={false}>Abrir consultas <ArrowUpRightIcon data-icon="inline-end" /></Button>
            <div className="flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground"><CircleCheckIcon className="size-4 text-chart-2" /> Visibilidade calculada por perfil</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
