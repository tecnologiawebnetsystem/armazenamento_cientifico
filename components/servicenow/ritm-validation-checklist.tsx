import { CheckCircle2Icon, CircleAlertIcon, ListChecksIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export type RitmValidationCheck = {
  label: string
  detail: string
  valid: boolean
}

export function RitmValidationChecklist({ checks }: { checks: RitmValidationCheck[] }) {
  const passed = checks.filter((check) => check.valid).length
  const isComplete = passed === checks.length

  return (
    <Card id="validacao-ritm" className="rounded-2xl border-petrobras-green/15 py-0 shadow-[var(--sigac-shadow-surface)]">
      <CardHeader className="border-b border-petrobras-green/10 bg-petrobras-green/5 gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecksIcon aria-hidden="true" className="size-4 text-primary" />
            Conferência antes de processar
          </CardTitle>
          <CardDescription>Valide os dados principais antes de alterar qualquer acesso.</CardDescription>
        </div>
        <Badge variant={isComplete ? "secondary" : "destructive"}>{passed} de {checks.length} itens válidos</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/70" aria-live="polite">
          {checks.map((check) => {
            const CheckIcon = check.valid ? CheckCircle2Icon : CircleAlertIcon
            return (
              <li key={check.label} className="flex items-start gap-3 px-5 py-3.5 transition-colors even:bg-petrobras-green/[0.025]">
                <CheckIcon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${check.valid ? "text-primary" : "text-destructive"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{check.detail}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
