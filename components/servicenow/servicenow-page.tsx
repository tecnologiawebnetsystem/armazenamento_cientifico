"use client"

import { useMemo, useRef, useState, type FormEvent } from "react"
import { ActivityIcon, ArrowRightIcon, CheckCircle2Icon, Clock3Icon, FolderKeyIcon, HistoryIcon, SearchIcon, ShieldCheckIcon, TriangleAlertIcon, UsersRoundIcon } from "lucide-react"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader, PageLayout } from "@/components/shared/page-layout"
import { AccessOperationsTable } from "@/components/servicenow/access-operations-table"
import { PendingRitmsTable } from "@/components/servicenow/pending-ritms-table"
import { RitmAuditTimeline } from "@/components/servicenow/ritm-audit-timeline"
import { RitmValidationChecklist, type RitmValidationCheck } from "@/components/servicenow/ritm-validation-checklist"
import { RitmWorkflow, type WorkflowStep } from "@/components/servicenow/ritm-workflow"
import { updateServiceNowRitmStatus } from "@/lib/api-client"
import { demoPendingRitms, demoServiceNowGateway, type ServiceNowAuditEntry, type ServiceNowOperationRun, type ServiceNowQueryLog, type ServiceNowRitm } from "@/lib/servicenow"

const statusVariant = (status: ServiceNowRitm["status"]) => status === "Concluído" ? "secondary" as const : status === "Falha" ? "destructive" as const : "outline" as const

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function ServiceNowPage() {
  const [ritmNumber, setRitmNumber] = useState("")
  const [activeRitm, setActiveRitm] = useState<ServiceNowRitm | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [queryMessage, setQueryMessage] = useState("")
  const [activeTab, setActiveTab] = useState("consulta")
  const [queryLogs, setQueryLogs] = useState<ServiceNowQueryLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [historyError, setHistoryError] = useState("")
  const [historyRitmFilter, setHistoryRitmFilter] = useState("")
  const [historyStatusFilter, setHistoryStatusFilter] = useState<ServiceNowQueryLog["status"] | "Todos">("Todos")
  const [operationRuns, setOperationRuns] = useState<Record<string, ServiceNowOperationRun>>({})
  const [auditEvents, setAuditEvents] = useState<ServiceNowAuditEntry[]>([])
  const [ticketStatus, setTicketStatus] = useState<ServiceNowRitm["status"]>("Aberto")
  const [isTicketUpdateDialogOpen, setIsTicketUpdateDialogOpen] = useState(false)
  const [isUpdatingTicket, setIsUpdatingTicket] = useState(false)
  const attemptCounts = useRef<Record<string, number>>({})

  const validationChecks = useMemo<RitmValidationCheck[]>(() => {
    if (!activeRitm) return []
    const validResponsibles = activeRitm.responsibles.filter((person) => person.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)).length
    const validGroups = activeRitm.accessGroups.filter((group) => group.name.trim() && group.members >= 0 && group.permission && group.operation).length
    return [
      { label: "Identificação da solicitação", detail: `RITM ${activeRitm.ritmNumber} · solicitação ${activeRitm.requestNumber || "sem número"}`, valid: /^RITM\d{5,}$/i.test(activeRitm.ritmNumber) && Boolean(activeRitm.requestNumber) },
      { label: "Área e caminho de rede", detail: activeRitm.networkArea.path || "Nome e caminho de rede precisam ser informados.", valid: Boolean(activeRitm.networkArea.name.trim() && activeRitm.networkArea.path.trim()) },
      { label: "Responsáveis identificados", detail: `${validResponsibles} de ${activeRitm.responsibles.length} contatos com nome e e-mail válidos.`, valid: activeRitm.responsibles.length > 0 && validResponsibles === activeRitm.responsibles.length },
      { label: "Grupos e permissões", detail: `${validGroups} de ${activeRitm.accessGroups.length} grupos com operação e permissão definidas.`, valid: activeRitm.accessGroups.length > 0 && validGroups === activeRitm.accessGroups.length },
    ]
  }, [activeRitm])

  const validationPassed = activeRitm !== null && validationChecks.length > 0 && validationChecks.every((check) => check.valid)
  const completedGroupCount = activeRitm?.accessGroups.filter((group) => (operationRuns[group.id]?.status ?? group.status) === "Concluído").length ?? 0
  const failedGroupCount = activeRitm?.accessGroups.filter((group) => operationRuns[group.id]?.status === "Falha").length ?? 0
  const pendingOperationCount = activeRitm ? activeRitm.accessGroups.length - completedGroupCount : 0
  const allGroupsComplete = Boolean(activeRitm && activeRitm.accessGroups.length > 0 && completedGroupCount === activeRitm.accessGroups.length)
  const isDemoRitm = activeRitm?.isDemo === true

  const workflowSteps: WorkflowStep[] = activeRitm ? [
    { label: "RITM localizado", detail: `${activeRitm.ritmNumber} encontrado na consulta.`, status: "Concluído" },
    { label: "Dados validados", detail: `${validationChecks.filter((check) => check.valid).length} de ${validationChecks.length} verificações aprovadas.`, status: validationPassed ? "Concluído" : "Falha" },
    { label: "Acessos processados", detail: `${completedGroupCount} de ${activeRitm.accessGroups.length} grupos concluídos.`, status: failedGroupCount > 0 ? "Falha" : allGroupsComplete ? "Concluído" : completedGroupCount > 0 || Object.values(operationRuns).some((run) => run.status === "Processando") ? "Em andamento" : "Pendente" },
    { label: "Chamado atualizado", detail: ticketStatus === "Concluído" ? "Status do RITM atualizado." : allGroupsComplete ? "A atualização está liberada." : "Disponível após concluir todos os grupos.", status: ticketStatus === "Concluído" ? "Concluído" : ticketStatus === "Falha" ? "Falha" : allGroupsComplete ? "Em andamento" : "Pendente" },
  ] : []

  const filteredQueryLogs = useMemo(() => queryLogs.filter((log) => {
    const matchesRitm = log.ritmNumber.toLowerCase().includes(historyRitmFilter.trim().toLowerCase())
    const matchesStatus = historyStatusFilter === "Todos" || log.status === historyStatusFilter
    return matchesRitm && matchesStatus
  }), [queryLogs, historyRitmFilter, historyStatusFilter])

  const filteredAuditEvents = useMemo(() => auditEvents.filter((event) => event.ritmNumber.toLowerCase().includes(historyRitmFilter.trim().toLowerCase())), [auditEvents, historyRitmFilter])

  function recordAuditEvent(input: Omit<ServiceNowAuditEntry, "id" | "timestamp" | "actor">) {
    setAuditEvents((current) => [{ ...input, id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: new Date().toISOString(), actor: "Sessão atual" }, ...current])
  }

  async function loadRitmDetails(value: string, scrollToDetails = false) {
    const normalizedRitm = value.trim().toUpperCase()
    setRitmNumber(normalizedRitm)
    if (!/^RITM\d{5,}$/i.test(normalizedRitm)) {
      setQueryMessage("Informe um número de RITM válido, como RITM0012345.")
      setActiveRitm(null)
      return
    }

    setIsSearching(true)
    setQueryMessage("")
    setActiveRitm(null)
    setOperationRuns({})
    setAuditEvents([])
    setTicketStatus("Aberto")
    attemptCounts.current = {}
    try {
      const request = await demoServiceNowGateway.findRitm(normalizedRitm)
      setActiveRitm(request)
      if (request) {
        setTicketStatus(request.status)
        recordAuditEvent({ ritmNumber: request.ritmNumber, category: "Consulta", title: "RITM localizado", description: `Solicitação ${request.requestNumber} consultada para análise do suporte.`, status: "Concluído" })
        if (scrollToDetails) {
          requestAnimationFrame(() => {
            const details = document.getElementById("ritm-details")
            details?.scrollIntoView({ behavior: "smooth", block: "start" })
            details?.focus({ preventScroll: true })
          })
        }
      } else {
        setQueryMessage("RITM não localizado na base demonstrativa. Confira o número e tente novamente.")
        recordAuditEvent({ ritmNumber: normalizedRitm, category: "Consulta", title: "RITM não localizado", description: "A consulta não retornou uma solicitação correspondente.", status: "Falha" })
      }
    } catch {
      setQueryMessage("Não foi possível consultar o RITM. Confira a conexão e tente novamente.")
      recordAuditEvent({ ritmNumber: normalizedRitm, category: "Consulta", title: "Falha na consulta", description: "O serviço não respondeu à consulta. Verifique a integração antes de tentar novamente.", status: "Falha" })
    } finally {
      setIsSearching(false)
    }
  }

  async function searchRitm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await loadRitmDetails(ritmNumber)
  }

  function openRitmFromQueue(number: string) {
    setActiveTab("consulta")
    void loadRitmDetails(number, true)
  }

  async function loadQueryLogs() {
    setIsLoadingLogs(true)
    setHistoryError("")
    try {
      setQueryLogs(await demoServiceNowGateway.listQueryLogs())
      setHistoryLoaded(true)
    } catch {
      setHistoryError("Não foi possível carregar o histórico. Tente novamente.")
    } finally {
      setIsLoadingLogs(false)
    }
  }

  async function processGroup(groupId: string) {
    if (!activeRitm || !validationPassed) return
    const group = activeRitm.accessGroups.find((item) => item.id === groupId)
    if (!group) return

    const attempts = (attemptCounts.current[groupId] ?? 0) + 1
    attemptCounts.current[groupId] = attempts
    setOperationRuns((current) => ({ ...current, [groupId]: { status: "Processando", attempts, attemptedAt: new Date().toISOString() } }))

    try {
      const result = await demoServiceNowGateway.processAccessOperation({ ritmNumber: activeRitm.ritmNumber, groupId, operation: group.operation })
      if (result.status === "Falha") {
        const category = result.failureCategory ?? "Integração"
        setOperationRuns((current) => ({ ...current, [groupId]: { status: "Falha", attempts, attemptedAt: result.completedAt, failureCategory: category, message: result.message } }))
        recordAuditEvent({ ritmNumber: activeRitm.ritmNumber, groupId, category: group.operation === "concessao" ? "Concessão" : "Revogação", title: "Falha ao processar grupo", description: `${category}: ${result.message}`, status: "Falha" })
        toast.error("Falha ao processar acesso", { description: "O grupo continua disponível para reprocessamento." })
        return
      }

      setOperationRuns((current) => ({ ...current, [groupId]: { status: "Concluído", attempts, attemptedAt: result.completedAt, message: result.message } }))
      recordAuditEvent({ ritmNumber: activeRitm.ritmNumber, groupId, category: group.operation === "concessao" ? "Concessão" : "Revogação", title: `${group.operation === "concessao" ? "Concessão" : "Revogação"} concluída`, description: result.message, status: "Concluído" })
      toast.success("Ação concluída", { description: result.message })
    } catch {
      const message = "Falha de comunicação com a integração. O grupo pode ser reprocessado."
      setOperationRuns((current) => ({ ...current, [groupId]: { status: "Falha", attempts, attemptedAt: new Date().toISOString(), failureCategory: "Integração", message } }))
      recordAuditEvent({ ritmNumber: activeRitm.ritmNumber, groupId, category: group.operation === "concessao" ? "Concessão" : "Revogação", title: "Falha de integração", description: message, status: "Falha" })
      toast.error("Falha ao processar acesso", { description: message })
    }
  }

  async function processGroups(groupIds: string[]) {
    await groupIds.reduce((queue, groupId) => queue.then(() => processGroup(groupId)), Promise.resolve())
  }

  async function updateRitmStatus() {
    if (!activeRitm || activeRitm.isDemo || !allGroupsComplete || !validationPassed) return
    setIsUpdatingTicket(true)
    try {
      const result = await updateServiceNowRitmStatus(activeRitm.ritmNumber, "Concluído")
      setTicketStatus(result.status)
      recordAuditEvent({ ritmNumber: activeRitm.ritmNumber, category: "Atualização", title: result.status === "Concluído" ? "Status do chamado atualizado" : "Falha ao atualizar chamado", description: result.message, status: result.status })
      if (result.status === "Concluído") toast.success("Status atualizado", { description: result.message })
      else toast.error("Falha ao atualizar chamado", { description: result.message })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar o chamado. Tente novamente após verificar a integração."
      setTicketStatus("Falha")
      recordAuditEvent({ ritmNumber: activeRitm.ritmNumber, category: "Atualização", title: "Falha ao atualizar chamado", description: message, status: "Falha" })
      toast.error("Falha ao atualizar chamado", { description: message })
    } finally {
      setIsUpdatingTicket(false)
    }
  }

  function handleTabChange(value: string) {
    setActiveTab(value)
    if (value === "historico" && !historyLoaded && !isLoadingLogs) void loadQueryLogs()
  }

  function handleNextAction() {
    if (!validationPassed) {
      document.getElementById("validacao-ritm")?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    if (pendingOperationCount > 0) {
      document.getElementById("operacoes-acesso")?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    if (isDemoRitm && ticketStatus !== "Concluído") {
      toast.info("Modo demonstração", { description: "Nenhuma atualização real de status será enviada com estes dados fictícios." })
      return
    }
    if (ticketStatus !== "Concluído") {
      setIsTicketUpdateDialogOpen(true)
      return
    }
    setActiveTab("historico")
    if (!historyLoaded && !isLoadingLogs) void loadQueryLogs()
  }

  const nextAction = !validationPassed
    ? { title: "Revise os dados da solicitação", description: "Há informações obrigatórias ausentes ou inválidas. Corrija antes de processar os acessos.", label: "Revisar dados", icon: TriangleAlertIcon }
    : failedGroupCount > 0
      ? { title: `${failedGroupCount} grupo(s) precisam de atenção`, description: "Revise a categoria da falha e reprocesse os grupos afetados.", label: "Ir para reprocessamento", icon: TriangleAlertIcon }
      : pendingOperationCount > 0
        ? { title: `${pendingOperationCount} grupo(s) aguardam processamento`, description: "Selecione os grupos solicitados e confirme a operação em lote ou individualmente.", label: "Ir para acessos", icon: ArrowRightIcon }
      : isDemoRitm && ticketStatus !== "Concluído"
        ? { title: "Visualização demonstrativa", description: "Os dados desta solicitação são fictícios. A atualização real do status no SIGAC fica desativada nesta demonstração.", label: "Ver modo de demonstração", icon: ShieldCheckIcon }
        : ticketStatus === "Falha"
          ? { title: "Falha ao atualizar o chamado", description: "Revise a integração e tente registrar novamente a conclusão do RITM.", label: "Tentar atualização novamente", icon: TriangleAlertIcon }
          : ticketStatus !== "Concluído"
            ? { title: "Acessos concluídos; falta atualizar o chamado", description: "Registre o encerramento do RITM depois de confirmar as alterações nos grupos.", label: "Atualizar chamado", icon: ArrowRightIcon }
          : { title: "Atendimento concluído", description: "O RITM e os grupos estão concluídos. Consulte a trilha para revisar as atividades.", label: "Ver auditoria", icon: CheckCircle2Icon }

  const NextActionIcon = nextAction.icon

  return (
    <PageLayout className="w-full min-w-0 gap-3 pb-2">
      <PageHeader
        eyebrow="Integração · ServiceNow"
        title="Central de atendimento Service Now"
        description="Consulte solicitações e acompanhe validações, acessos e histórico em um só lugar."
        actions={<Badge variant="outline" className="gap-1.5 border-petrobras-yellow/50 bg-petrobras-yellow/15 text-foreground"><ShieldCheckIcon aria-hidden="true" />Ambiente demonstrativo</Badge>}
        className="min-h-0 gap-2 rounded-xl px-4 py-3 sm:px-5 sm:py-3"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full min-w-0 gap-3">
        <TabsList aria-label="Seções da integração ServiceNow" className="h-9 w-full flex-wrap justify-start p-1 sm:w-fit">
          <TabsTrigger value="consulta" className="h-7 gap-2 px-3 text-sm data-active:text-primary"><SearchIcon aria-hidden="true" />Atendimento</TabsTrigger>
          <TabsTrigger value="historico" className="h-7 gap-2 px-3 text-sm data-active:text-primary"><HistoryIcon aria-hidden="true" />Histórico e auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="consulta" className="flex flex-col gap-3">
          <Card className="overflow-hidden rounded-2xl border-petrobras-green/15 py-0 shadow-[var(--sigac-shadow-surface)]">
            <CardHeader className="border-b border-petrobras-green/10 bg-petrobras-green/5 gap-1 px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm"><span className="grid size-7 place-items-center rounded-lg bg-petrobras-green/10 text-primary"><SearchIcon aria-hidden="true" className="size-4" /></span>Localizar solicitação</CardTitle>
              <CardDescription className="text-xs">Informe o RITM para visualizar área de rede, responsáveis, permissões e próximas ações.</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <form onSubmit={searchRitm} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <label htmlFor="ritm-number" className="text-xs font-medium">Número do RITM</label>
                  <Input id="ritm-number" name="ritmNumber" autoComplete="off" spellCheck={false} placeholder="Ex.: RITM0012345" value={ritmNumber} onChange={(event) => { setRitmNumber(event.target.value.toUpperCase()); if (queryMessage) setQueryMessage("") }} aria-describedby="ritm-help" aria-invalid={Boolean(queryMessage)} className="h-9 rounded-lg border-petrobras-green/20 bg-background text-sm shadow-sm focus-visible:border-petrobras-green focus-visible:ring-petrobras-green/20" />
                  <span id="ritm-help" className="text-xs leading-5 text-muted-foreground">Formato esperado: RITM seguido de pelo menos cinco dígitos.</span>
                </div>
                <Button type="submit" disabled={isSearching} className="h-9 rounded-lg px-4 font-semibold shadow-sm sm:min-w-36"><SearchIcon data-icon="inline-start" />{isSearching ? "Consultando…" : "Consultar RITM"}</Button>
              </form>
              {queryMessage ? <p role="alert" aria-live="polite" className="mt-4 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm leading-6 text-destructive">{queryMessage}</p> : null}
            </CardContent>
          </Card>

          <PendingRitmsTable requests={demoPendingRitms} onOpenRitm={openRitmFromQueue} />

          {activeRitm ? <div id="ritm-details" tabIndex={-1} role="region" aria-label={`Detalhes do ${activeRitm.ritmNumber}`} className="flex scroll-mt-6 flex-col gap-4 outline-none" aria-live="polite">
            <section aria-label="Resumo do RITM" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-xl border-petrobras-green/15 py-2 shadow-[var(--sigac-shadow-surface)]"><CardContent className="flex items-start justify-between gap-2 px-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RITM</p><p className="mt-2 font-mono text-base font-semibold">{activeRitm.ritmNumber}</p><p className="mt-1 text-xs text-muted-foreground">Solicitação {activeRitm.requestNumber}</p></div><span className="rounded-lg bg-primary/10 p-2 text-primary"><FolderKeyIcon aria-hidden="true" className="size-5" /></span></CardContent></Card>
              <Card className="rounded-xl border-petrobras-green/15 py-2 shadow-[var(--sigac-shadow-surface)]"><CardContent className="flex items-start justify-between gap-2 px-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status do chamado</p><Badge variant={statusVariant(ticketStatus)} className="mt-2">{ticketStatus}</Badge><p className="mt-2 text-xs text-muted-foreground">Aberto por {activeRitm.requestedBy}</p></div><span className="rounded-lg bg-petrobras-yellow/20 p-2 text-foreground"><ActivityIcon aria-hidden="true" className="size-5" /></span></CardContent></Card>
              <Card className="rounded-xl border-petrobras-green/15 py-2 shadow-[var(--sigac-shadow-surface)]"><CardContent className="flex items-start justify-between gap-2 px-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Área de rede</p><p className="mt-2 font-semibold leading-5">{activeRitm.networkArea.name}</p><p className="mt-1 text-xs text-muted-foreground">{activeRitm.networkArea.responsibleArea}</p></div><span className="rounded-lg bg-primary/10 p-2 text-primary"><ShieldCheckIcon aria-hidden="true" className="size-5" /></span></CardContent></Card>
              <Card className="rounded-xl border-petrobras-green/15 py-2 shadow-[var(--sigac-shadow-surface)]"><CardContent className="flex items-start justify-between gap-2 px-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações pendentes</p><p className="mt-2 font-mono text-xl font-semibold tabular-nums">{pendingOperationCount}</p><p className="mt-1 text-xs text-muted-foreground">{failedGroupCount ? `${failedGroupCount} falha(s) para revisar` : "Grupos para processar"}</p></div><span className="rounded-lg bg-petrobras-yellow/20 p-2 text-foreground"><Clock3Icon aria-hidden="true" className="size-5" /></span></CardContent></Card>
            </section>

            <RitmWorkflow steps={workflowSteps} />

            <Card className={`rounded-2xl border-petrobras-green/15 py-0 shadow-[var(--sigac-shadow-surface)] ${failedGroupCount || !validationPassed ? "border-destructive/30 bg-destructive/[0.03]" : "bg-primary/[0.03]"}`}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg ${failedGroupCount || !validationPassed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}><NextActionIcon aria-hidden="true" className="size-5" /></span>
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Próxima ação recomendada</p><h2 className="mt-1 text-base font-semibold text-balance">{nextAction.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{nextAction.description}</p></div>
                </div>
                <Button variant={failedGroupCount || !validationPassed ? "outline" : "default"} className="shrink-0" onClick={handleNextAction}>{nextAction.label}<ArrowRightIcon data-icon="inline-end" /></Button>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="rounded-2xl border-petrobras-green/15 py-0 shadow-[var(--sigac-shadow-surface)]">
                <CardHeader className="border-b border-petrobras-green/10 bg-petrobras-green/5 px-4 py-3"><CardTitle className="text-sm">Dados da área de rede</CardTitle><CardDescription className="text-xs">Informações da solicitação que orientam a execução.</CardDescription></CardHeader>
                <CardContent className="flex flex-col gap-4 p-4">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caminho de rede</p><code className="mt-2 block break-all rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-xs leading-5">{activeRitm.networkArea.path || "Não informado"}</code></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição</p><p className="mt-1 text-sm leading-6">{activeRitm.networkArea.description || "Sem descrição informada."}</p></div>
                  <Separator />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Clock3Icon aria-hidden="true" className="size-4" /><span>Solicitação criada em {formatTimestamp(activeRitm.requestedAt)}</span><span aria-hidden="true">·</span><span>{activeRitm.networkArea.responsibleArea}</span></div>
                </CardContent>
              </Card>
              <RitmValidationChecklist checks={validationChecks} />
            </div>

            <Card className="rounded-2xl border-petrobras-green/15 py-0 shadow-[var(--sigac-shadow-surface)]">
              <CardHeader className="border-b border-petrobras-green/10 bg-petrobras-green/5 px-4 py-3"><CardTitle className="flex items-center gap-2 text-sm"><UsersRoundIcon aria-hidden="true" className="size-4 text-primary" />Responsáveis pela área</CardTitle><CardDescription className="text-xs">Contatos responsáveis informados na solicitação.</CardDescription></CardHeader>
              <CardContent className="grid gap-0 divide-y sm:grid-cols-2 sm:divide-y-0 sm:divide-x">{activeRitm.responsibles.map((person) => <div key={person.email} className="flex flex-col gap-1 px-4 py-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-medium">{person.name}</p><Badge variant="outline" className="w-fit shrink-0">{person.role}</Badge></div><a className="sigac-focus-ring inline-block max-w-full truncate rounded-sm text-xs text-muted-foreground underline-offset-4 hover:underline" href={`mailto:${person.email}`}>{person.email}</a></div>)}</CardContent>
            </Card>

            <AccessOperationsTable key={activeRitm.ritmNumber} groups={activeRitm.accessGroups} runs={operationRuns} canProcess={validationPassed} onProcess={processGroups} />

            <RitmAuditTimeline events={auditEvents.filter((event) => event.ritmNumber === activeRitm.ritmNumber)} />
          </div> : null}
        </TabsContent>

        <TabsContent value="historico" className="flex flex-col gap-3">
          <Card className="overflow-hidden rounded-2xl border-petrobras-green/15 py-0 shadow-[var(--sigac-shadow-surface)]">
            <CardHeader className="border-b border-petrobras-green/10 bg-petrobras-green/5 gap-1 px-4 py-3"><CardTitle className="flex items-center gap-2 text-base"><HistoryIcon aria-hidden="true" className="size-4 text-primary" />Consultas recentes</CardTitle><CardDescription>Filtre consultas e localize rapidamente falhas por RITM e situação.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-end">
                <div className="flex flex-col gap-2"><label htmlFor="history-ritm-filter" className="text-sm font-medium">Filtrar por RITM</label><Input id="history-ritm-filter" value={historyRitmFilter} onChange={(event) => setHistoryRitmFilter(event.target.value.toUpperCase())} placeholder="Ex.: RITM0012345" className="h-9 rounded-lg border-petrobras-green/20 bg-background text-sm shadow-sm focus-visible:border-petrobras-green focus-visible:ring-petrobras-green/20" /></div>
                <div className="flex flex-col gap-2"><span id="history-status-label" className="text-sm font-medium">Situação da consulta</span><Select value={historyStatusFilter} onValueChange={(value) => setHistoryStatusFilter((value ?? "Todos") as ServiceNowQueryLog["status"] | "Todos")}><SelectTrigger aria-labelledby="history-status-label" className="h-9 rounded-lg border-petrobras-green/20 bg-background text-sm shadow-sm focus-visible:border-petrobras-green focus-visible:ring-petrobras-green/20"><SelectValue placeholder="Todas as situações" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="Todos">Todas as situações</SelectItem><SelectItem value="Sucesso">Sucesso</SelectItem><SelectItem value="Não encontrado">Não encontrado</SelectItem><SelectItem value="Falha de integração">Falha de integração</SelectItem></SelectGroup></SelectContent></Select></div>
              </div>
              {isLoadingLogs ? <p role="status" className="py-2 text-sm text-muted-foreground">Carregando histórico…</p> : null}
              {historyError ? <div role="alert" className="flex flex-col gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"><p>{historyError}</p><Button size="sm" variant="outline" onClick={() => void loadQueryLogs()}>Tentar novamente</Button></div> : null}
              {!isLoadingLogs && !historyError && filteredQueryLogs.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma consulta corresponde aos filtros selecionados.</p> : null}
              {filteredQueryLogs.length > 0 ? <div className="overflow-x-auto rounded-lg border border-border/70"><Table className="[&_th]:h-8 [&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_td]:p-1.5"><TableHeader><TableRow className="bg-muted/20 hover:bg-muted/20"><TableHead>RITM</TableHead><TableHead>Data e hora</TableHead><TableHead>Status</TableHead><TableHead>Duração</TableHead><TableHead>Usuário</TableHead></TableRow></TableHeader><TableBody>{filteredQueryLogs.map((log) => <TableRow key={log.id}><TableCell className="font-mono text-sm font-medium">{log.ritmNumber}</TableCell><TableCell><time className="text-sm text-muted-foreground" dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time></TableCell><TableCell><Badge variant={log.status === "Sucesso" ? "secondary" : log.status === "Falha de integração" ? "destructive" : "outline"}>{log.status}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{log.duration}</TableCell><TableCell className="text-sm">{log.actor}</TableCell></TableRow>)}</TableBody></Table></div> : null}
            </CardContent>
          </Card>

          <RitmAuditTimeline events={filteredAuditEvents} title="Trilha de auditoria desta sessão" description="Consultas, concessões, revogações, tentativas e atualizações feitas nesta sessão. No backend, esta trilha deverá vir do serviço de auditoria." />
        </TabsContent>
      </Tabs>

      <AlertDialog open={isTicketUpdateDialogOpen} onOpenChange={setIsTicketUpdateDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-petrobras-green/15 shadow-[var(--sigac-shadow-hover)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Atualizar status do RITM?</AlertDialogTitle>
            <AlertDialogDescription>O fluxo está com todos os grupos concluídos. Confirme o encerramento do chamado {activeRitm?.ritmNumber}.</AlertDialogDescription>
            <p className="text-xs leading-5 text-muted-foreground">A alteração será enviada ao SIGAC pelo backend. A confirmação só aparece após o serviço aceitar a atualização.</p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar</AlertDialogCancel>
            <AlertDialogAction disabled={isUpdatingTicket} onClick={() => { setIsTicketUpdateDialogOpen(false); void updateRitmStatus() }}>Atualizar chamado</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}
