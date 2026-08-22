import { FolderKanbanIcon, DatabaseIcon, UsersIcon, ClipboardListIcon, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface KpiItem {
  label: string
  value: string
  icon: LucideIcon
  hint?: string
}

function formatStorage(mb: number) {
  const gb = mb / 1024
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${mb.toFixed(0)} MB`
}

export function buildKpis({
  totalProjetos,
  projetosAtivos,
  armazenamentoTotalMb,
  totalMembros,
  solicitacoesPendentes,
}: {
  totalProjetos: number
  projetosAtivos: number
  armazenamentoTotalMb: number
  totalMembros: number
  solicitacoesPendentes: number
}): KpiItem[] {
  return [
    {
      label: "Projetos",
      value: String(totalProjetos),
      hint: `${projetosAtivos} ativos`,
      icon: FolderKanbanIcon,
    },
    {
      label: "Armazenamento usado",
      value: formatStorage(armazenamentoTotalMb),
      icon: DatabaseIcon,
    },
    {
      label: "Membros envolvidos",
      value: String(totalMembros),
      icon: UsersIcon,
    },
    {
      label: "Solicitações pendentes",
      value: String(solicitacoesPendentes),
      icon: ClipboardListIcon,
      hint: solicitacoesPendentes > 0 ? "aguardando análise" : "tudo em dia",
    },
  ]
}

export function KpiCards({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-center gap-4">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
              )}
            >
              <item.icon className="size-5" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-2xl font-semibold tracking-tight text-foreground">{item.value}</span>
              <span className="truncate text-xs text-muted-foreground">
                {item.label}
                {item.hint ? ` · ${item.hint}` : ""}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
