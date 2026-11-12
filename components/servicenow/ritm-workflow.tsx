import { ActivityIcon, AlertTriangleIcon, CheckCircle2Icon, CircleDashedIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export type WorkflowStep = {
  label: string
  detail: string
  status: "Concluído" | "Em andamento" | "Pendente" | "Falha"
}

function getStatusVariant(status: WorkflowStep["status"]) {
  if (status === "Concluído") return "secondary" as const
  if (status === "Falha") return "destructive" as const
  return "outline" as const
}

export function RitmWorkflow({ steps }: { steps: WorkflowStep[] }) {
  const completedSteps = steps.filter((step) => step.status === "Concluído").length
  const progressValue = Math.round((completedSteps / Math.max(steps.length, 1)) * 100)

  return (
    <Card className="rounded-2xl border-petrobras-green/15 py-0 shadow-[var(--sigac-shadow-surface)]">
      <CardHeader className="border-b border-petrobras-green/10 bg-petrobras-green/5 gap-1 px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon aria-hidden="true" className="size-4 text-primary" />
          Progresso do atendimento
        </CardTitle>
        <CardDescription>Veja rapidamente onde o fluxo do RITM está parado e o que falta concluir.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-5">
        <Progress value={progressValue} aria-label={`Progresso do atendimento: ${progressValue}%`} />
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const StepIcon = step.status === "Concluído" ? CheckCircle2Icon : step.status === "Falha" ? AlertTriangleIcon : step.status === "Em andamento" ? ActivityIcon : CircleDashedIcon
            return (
              <li key={step.label} className="flex min-w-0 items-start gap-3">
                <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${step.status === "Concluído" ? "bg-primary/10 text-primary" : step.status === "Falha" ? "bg-destructive/10 text-destructive" : step.status === "Em andamento" ? "bg-petrobras-yellow/25 text-foreground" : "bg-muted text-muted-foreground"}`}>
                  <StepIcon aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Etapa {index + 1}</span>
                    <Badge variant={getStatusVariant(step.status)} className="h-5 px-1.5 text-[10px]">{step.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{step.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
