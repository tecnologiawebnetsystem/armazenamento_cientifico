import { FolderKanbanIcon, DatabaseIcon, UsersIcon, ClipboardListIcon, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface KpiItem {
  label: string
  value: string
  icon: LucideIcon
  hint?: string
  tone?: "green" | "yellow" | "blue" | "teal"
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
      tone: "green",
    },
    {
      label: "Armazenamento usado",
      value: formatStorage(armazenamentoTotalMb),
      icon: DatabaseIcon,
      tone: "blue",
    },
    {
      label: "Membros envolvidos",
      value: String(totalMembros),
      icon: UsersIcon,
      tone: "teal",
    },
    {
      label: "Solicitações pendentes",
      value: String(solicitacoesPendentes),
      icon: ClipboardListIcon,
      hint: solicitacoesPendentes > 0 ? "aguardando análise" : "tudo em dia",
      tone: "yellow",
    },
  ]
}

export function KpiCards({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className={cn(
            "relative overflow-hidden border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
            item.tone === "yellow" && "border-petrobras-yellow/40 !bg-petrobras-yellow/15 bg-gradient-to-br from-petrobras-yellow/20 via-petrobras-yellow/10 to-card",
            item.tone === "blue" && "border-petrobras-blue/35 !bg-petrobras-blue/15 bg-gradient-to-br from-petrobras-blue/20 via-petrobras-blue/10 to-card",
            item.tone === "teal" && "border-petrobras-teal/35 !bg-petrobras-teal/15 bg-gradient-to-br from-petrobras-teal/20 via-petrobras-teal/10 to-card",
            (!item.tone || item.tone === "green") && "border-petrobras-green/35 !bg-petrobras-green/15 bg-gradient-to-br from-petrobras-green/20 via-petrobras-green/10 to-card",
          )}
        >
          <CardContent className="relative flex items-center gap-4">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset",
                item.tone === "yellow" && "bg-petrobras-yellow/20 text-petrobras-yellow ring-petrobras-yellow/25",
                item.tone === "blue" && "bg-petrobras-blue/15 text-petrobras-blue ring-petrobras-blue/20",
                item.tone === "teal" && "bg-petrobras-teal/15 text-petrobras-teal ring-petrobras-teal/20",
                (!item.tone || item.tone === "green") && "bg-petrobras-green/15 text-petrobras-green ring-petrobras-green/20",
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
