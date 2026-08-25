import Link from "next/link"
import {
  DatabaseIcon,
  FolderKanbanIcon,
  GaugeIcon,
  MapIcon,
  UsersIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Project } from "@/lib/types"

interface Props {
  projects: Project[]
  totalMembros: number
  totalMapas: number
  armazenamentoMb: number
  pendencias: number
}

function formatStorage(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`
}

export function ExecutiveDashboard({ projects, totalMembros, totalMapas, armazenamentoMb, pendencias }: Props) {
  const ativos = projects.filter((project) => project.status === "ativo").length
  const concluidos = projects.filter((project) => project.status === "concluido").length
  const suspensos = projects.filter((project) => project.status === "suspenso").length
  const total = Math.max(projects.length, 1)

  return (
    <div className="flex flex-col gap-6">
      

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

      <div className="grid gap-6">
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

        
      </div>
    </div>
  )
}
