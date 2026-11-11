"use client"

import { useMemo, useState } from "react"
import { ActivityIcon, ArrowDownToLineIcon, ArrowUpFromLineIcon, CheckCircle2Icon, Clock3Icon, ExternalLinkIcon, FolderKeyIcon, HistoryIcon, SearchIcon, ShieldCheckIcon, UsersRoundIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader, PageLayout } from "@/components/shared/page-layout"
import { demoServiceNowGateway, type ServiceNowQueryLog, type ServiceNowRitm } from "@/lib/servicenow"

const statusVariant = (status: ServiceNowRitm["status"]) => status === "Concluído" ? "secondary" as const : status === "Falha" ? "destructive" as const : "outline" as const

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function ServiceNowPage() {
  const [ritmNumber, setRitmNumber] = useState("RITM0012345")
  const [activeRitm, setActiveRitm] = useState<ServiceNowRitm | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [queryMessage, setQueryMessage] = useState("")
  const [activeTab, setActiveTab] = useState("consulta")
  const [queryLogs, setQueryLogs] = useState<ServiceNowQueryLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [historyError, setHistoryError] = useState("")
  const [processingGroupId, setProcessingGroupId] = useState<string | null>(null)
  const [updatedGroups, setUpdatedGroups] = useState<Record<string, "Pendente" | "Concluído">>({})
  const pendingOperations = useMemo(() => activeRitm?.accessGroups.filter((group) => (updatedGroups[group.id] ?? group.status) === "Pendente").length ?? 0, [activeRitm, updatedGroups])

  async function searchRitm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!/^RITM\d{5,}$/i.test(ritmNumber.trim())) {
      setQueryMessage("Informe um número de RITM válido, como RITM0012345.")
      setActiveRitm(null)
      return
    }

    setIsSearching(true)
    setQueryMessage("")
    try {
      const request = await demoServiceNowGateway.findRitm(ritmNumber)
      setActiveRitm(request)
      setQueryMessage(request ? "" : "RITM não localizado na base demonstrativa. Nenhuma chamada real foi feita.")
    } catch {
      setActiveRitm(null)
      setQueryMessage("Não foi possível concluir a consulta demonstrativa. Tente novamente.")
    } finally {
      setIsSearching(false)
    }
  }

  async function loadQueryLogs() {
    setIsLoadingLogs(true)
    setHistoryError("")
    try {
      setQueryLogs(await demoServiceNowGateway.listQueryLogs())
    } catch {
      setHistoryError("Não foi possível carregar o histórico demonstrativo.")
    } finally {
      setIsLoadingLogs(false)
    }
  }

  async function simulateOperation(groupId: string, operation: "concessao" | "revogacao") {
    if (!activeRitm) return

    setProcessingGroupId(groupId)
    try {
      const result = await demoServiceNowGateway.processAccessOperation({
        ritmNumber: activeRitm.ritmNumber,
        groupId,
        operation,
      })
      if (result.status === "Falha") throw new Error(result.message)
      setUpdatedGroups((current) => ({ ...current, [groupId]: "Concluído" }))
      toast.info("Ação demonstrativa", { description: result.message })
    } catch {
      toast.error("Não foi possível concluir a simulação.")
    } finally {
      setProcessingGroupId(null)
    }
  }

  return (
    <PageLayout>
      <PageHeader
        eyebrow="Gestão de acessos · ServiceNow"
        title="Integração ServiceNow"
        description="Consulte RITMs de criação de área de rede e prepare o fluxo de concessão, revogação e rastreabilidade de acessos."
      />

      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); if (value === "historico") void loadQueryLogs() }} className="gap-5">
        <TabsList aria-label="Seções da integração ServiceNow" className="h-auto w-full flex-wrap justify-start rounded-xl border border-border/70 bg-card p-1 sm:w-fit">
          <TabsTrigger value="consulta" className="gap-2"><SearchIcon aria-hidden="true" />Consulta de RITM</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2"><HistoryIcon aria-hidden="true" />Histórico de consultas</TabsTrigger>
        </TabsList>

        <TabsContent value="consulta" className="flex flex-col gap-5">
          <Card className="overflow-hidden rounded-xl border-border/70 py-0 shadow-sm">
            <CardHeader className="sigac-section-header gap-1 px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-base"><SearchIcon aria-hidden="true" className="size-4 text-primary" />Localizar solicitação</CardTitle>
              <CardDescription>Informe o número do RITM para recuperar os dados de área de rede, responsáveis e grupos envolvidos.</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={searchRitm} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <label htmlFor="ritm-number" className="text-sm font-medium">Número do RITM</label>
                  <Input id="ritm-number" name="ritmNumber" autoComplete="off" spellCheck={false} placeholder="Ex.: RITM0012345" value={ritmNumber} onChange={(event) => setRitmNumber(event.target.value.toUpperCase())} aria-describedby="ritm-help" aria-invalid={Boolean(queryMessage && !activeRitm)} />
                  <span id="ritm-help" className="text-xs text-muted-foreground">Formato esperado: RITM seguido de pelo menos cinco dígitos.</span>
                </div>
                <Button type="submit" disabled={isSearching} className="sm:min-w-40"><SearchIcon data-icon="inline-start" />{isSearching ? "Consultando…" : "Consultar RITM"}</Button>
              </form>
              {queryMessage ? <p role={activeRitm ? "status" : "alert"} aria-live="polite" className={`mt-4 rounded-lg border px-3 py-2 text-sm leading-6 ${activeRitm ? "border-primary/20 bg-primary/5 text-foreground" : "border-destructive/25 bg-destructive/5 text-destructive"}`}>{queryMessage}</p> : null}
            </CardContent>
          </Card>

          {activeRitm ? <div className="flex flex-col gap-5" aria-live="polite">
            <section aria-label="Resumo do RITM" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-xl border-border/70 py-4 shadow-sm"><CardContent className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RITM</p><p className="mt-2 font-mono text-lg font-semibold">{activeRitm.ritmNumber}</p><p className="mt-1 text-xs text-muted-foreground">Solicitação {activeRitm.requestNumber}</p></div><span className="rounded-lg bg-primary/10 p-2 text-primary"><FolderKeyIcon aria-hidden="true" className="size-5" /></span></CardContent></Card>
              <Card className="rounded-xl border-border/70 py-4 shadow-sm"><CardContent className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status do chamado</p><Badge variant={statusVariant(activeRitm.status)} className="mt-2">{activeRitm.status}</Badge><p className="mt-2 text-xs text-muted-foreground">Aberto por {activeRitm.requestedBy}</p></div><span className="rounded-lg bg-petrobras-yellow/20 p-2 text-foreground"><ActivityIcon aria-hidden="true" className="size-5" /></span></CardContent></Card>
              <Card className="rounded-xl border-border/70 py-4 shadow-sm"><CardContent className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Área de rede</p><p className="mt-2 font-semibold leading-5">{activeRitm.networkArea.name}</p><p className="mt-1 text-xs text-muted-foreground">{activeRitm.networkArea.responsibleArea}</p></div><span className="rounded-lg bg-primary/10 p-2 text-primary"><ShieldCheckIcon aria-hidden="true" className="size-5" /></span></CardContent></Card>
              <Card className="rounded-xl border-border/70 py-4 shadow-sm"><CardContent className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações pendentes</p><p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{pendingOperations}</p><p className="mt-1 text-xs text-muted-foreground">Grupos para processar</p></div><span className="rounded-lg bg-petrobras-yellow/20 p-2 text-foreground"><Clock3Icon aria-hidden="true" className="size-5" /></span></CardContent></Card>
            </section>

            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="rounded-xl border-border/70 py-0 shadow-sm">
                <CardHeader className="sigac-section-header px-5 py-4"><CardTitle className="text-base">Dados da área de rede</CardTitle><CardDescription>Informações retornadas no RITM para alimentar o fluxo de acesso.</CardDescription></CardHeader>
                <CardContent className="flex flex-col gap-4 p-5">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caminho de rede</p><code className="mt-2 block break-all rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-xs leading-5">{activeRitm.networkArea.path}</code></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição</p><p className="mt-1 text-sm leading-6">{activeRitm.networkArea.description}</p></div>
                  <Separator />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3Icon aria-hidden="true" className="size-4" />Solicitação criada em {formatTimestamp(activeRitm.requestedAt)}</div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border/70 py-0 shadow-sm">
                <CardHeader className="sigac-section-header px-5 py-4"><CardTitle className="flex items-center gap-2 text-base"><UsersRoundIcon aria-hidden="true" className="size-4 text-primary" />Responsáveis pela área</CardTitle><CardDescription>Contatos responsáveis informados na solicitação.</CardDescription></CardHeader>
                <CardContent className="divide-y p-0">{activeRitm.responsibles.map((person) => <div key={person.email} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{person.name}</p><a className="sigac-focus-ring mt-1 inline-block max-w-full truncate rounded-sm text-xs text-muted-foreground underline-offset-4 hover:underline" href={`mailto:${person.email}`}>{person.email}</a></div><Badge variant="outline" className="w-fit shrink-0">{person.role}</Badge></div>)}</CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden rounded-xl border-border/70 py-0 shadow-sm">
              <CardHeader className="sigac-section-header gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">Concessão e revogação de acessos</CardTitle><CardDescription>Grupos de diretório identificados na solicitação e ação prevista para cada um.</CardDescription></div><Badge variant="outline" className="w-fit">{activeRitm.accessGroups.length} grupos</Badge></CardHeader>
              <CardContent className="p-0">
                <div className="hidden grid-cols-[minmax(0,1fr)_10rem_9rem_8rem] gap-4 border-b border-border/70 bg-muted/20 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid"><span>Grupo de acesso</span><span>Permissão</span><span>Operação</span><span>Status</span></div>
                <div className="divide-y divide-border/70">{activeRitm.accessGroups.map((group) => {
                  const operationStatus = updatedGroups[group.id] ?? group.status
                  const isGrant = group.operation === "concessao"
                  return <div key={group.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_10rem_9rem_8rem] md:items-center md:gap-4">
                    <div className="min-w-0"><p className="break-all font-mono text-xs font-medium leading-5">{group.name}</p><p className="mt-1 text-xs text-muted-foreground">{group.members} pessoas vinculadas</p></div>
                    <span className="text-sm">{group.permission}</span>
                    <Badge variant={isGrant ? "secondary" : "outline"} className="w-fit">{isGrant ? "Concessão" : "Revogação"}</Badge>
                    <div className="flex flex-wrap items-center gap-2"><Badge variant={operationStatus === "Concluído" ? "secondary" : "outline"}>{operationStatus}</Badge><Button variant="ghost" size="sm" className="h-8" disabled={processingGroupId === group.id} onClick={() => void simulateOperation(group.id, group.operation)} aria-label={`${isGrant ? "Simular concessão" : "Simular revogação"} para ${group.name}`}><span className="sr-only">{isGrant ? "Simular concessão" : "Simular revogação"}</span>{isGrant ? <ArrowUpFromLineIcon aria-hidden="true" /> : <ArrowDownToLineIcon aria-hidden="true" />}</Button></div>
                  </div>
                })}</div>
                <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-muted-foreground">No fluxo integrado, as alterações serão enviadas ao backend e registradas na auditoria.</p><Button variant="outline" disabled onClick={() => undefined}>Processar acessos <ExternalLinkIcon data-icon="inline-end" /></Button></div>
              </CardContent>
            </Card>
          </div> : null}
        </TabsContent>

        <TabsContent value="historico" className="flex flex-col gap-5">
          <Card className="overflow-hidden rounded-xl border-border/70 py-0 shadow-sm">
            <CardHeader className="sigac-section-header gap-1 px-5 py-4"><CardTitle className="flex items-center gap-2 text-base"><HistoryIcon aria-hidden="true" className="size-4 text-primary" />Consultas recentes</CardTitle><CardDescription>Estrutura preparada para apresentar os registros de consulta e falhas retornados pelo backend.</CardDescription></CardHeader>
            <CardContent className="p-0">
              {isLoadingLogs ? <p role="status" className="px-5 py-4 text-sm text-muted-foreground">Carregando histórico demonstrativo…</p> : null}
              {historyError ? <p role="alert" className="px-5 py-4 text-sm text-destructive">{historyError}</p> : null}
              {!isLoadingLogs && !historyError && queryLogs.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhuma consulta demonstrativa disponível.</p> : null}
              {queryLogs.length > 0 ? <>
                <div className="hidden grid-cols-[1fr_1.2fr_1fr_0.7fr_1fr] gap-4 border-b border-border/70 bg-muted/20 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid"><span>RITM</span><span>Data e hora</span><span>Status</span><span>Duração</span><span>Usuário</span></div>
                <div className="divide-y divide-border/70">{queryLogs.map((log) => <div key={log.id} className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_1.2fr_1fr_0.7fr_1fr] md:items-center md:gap-4"><span className="font-mono text-sm font-medium">{log.ritmNumber}</span><time className="text-sm text-muted-foreground" dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time><Badge variant={log.status === "Sucesso" ? "secondary" : "outline"} className="w-fit">{log.status}</Badge><span className="text-sm text-muted-foreground">{log.duration}</span><span className="text-sm">{log.actor}</span></div>)}</div>
              </> : null}
              <div className="flex items-start gap-3 border-t border-border/70 bg-muted/20 p-4 text-xs leading-5 text-muted-foreground"><CheckCircle2Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><p>Os registros exibidos são dados fictícios para demonstração. A persistência e consulta do histórico dependem do endpoint de auditoria do backend.</p></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
