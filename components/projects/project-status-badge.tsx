import { Badge } from "@/components/ui/badge"
import type { ProjectStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-success/10 text-success border-success/30" },
  concluido: { label: "Concluído", className: "bg-primary/10 text-primary border-primary/30" },
  suspenso: { label: "Suspenso", className: "bg-warning/10 text-warning border-warning/30" },
}

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
