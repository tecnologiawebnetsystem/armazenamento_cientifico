import { Badge } from "@/components/ui/badge"
import type { ProjectAccessMapGroup } from "@/lib/types"

export function AccessGroupCard({ group }: { group: ProjectAccessMapGroup }) {
  const nameIsSid = /^S-\d-\d+(?:-\d+)+$/i.test(group.nome.trim())

  return (
    <div className="rounded-xl border border-border/80 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {nameIsSid ? "Nome não resolvido" : "Nome do grupo"}
          </p>
          <p className="mt-1 break-all font-semibold text-foreground">
            {group.nome.trim()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Fonte: {group.fonte}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Badge variant="outline">
            {group.principalType === "role" ? "Papel" : "Grupo"}
          </Badge>
          <Badge variant="secondary">{group.nivel}</Badge>
        </div>
      </div>
      <div
        className="mt-3 flex flex-col gap-1"
        aria-label={`Identificadores de ${group.nome}`}
      >
        <p className="text-xs text-muted-foreground">
          SID / identificador corporativo
        </p>
        {group.identificadores.map((identifier) => (
          <code
            key={identifier}
            className="rounded bg-muted px-2 py-1 text-xs break-all text-muted-foreground"
          >
            {identifier}
          </code>
        ))}
      </div>
    </div>
  )
}
