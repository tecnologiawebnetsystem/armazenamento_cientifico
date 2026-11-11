"use client"

import { useMemo, useState } from "react"
import { ArrowDownToLineIcon, ArrowUpFromLineIcon, CircleAlertIcon, LoaderCircleIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ServiceNowAccessGroup, ServiceNowOperationRun } from "@/lib/servicenow"

type AccessOperationsTableProps = {
  groups: ServiceNowAccessGroup[]
  runs: Record<string, ServiceNowOperationRun>
  canProcess: boolean
  onProcess: (groupIds: string[]) => Promise<void>
}

function getRunStatus(group: ServiceNowAccessGroup, run?: ServiceNowOperationRun) {
  return run?.status ?? group.status
}

function getStatusVariant(status: ServiceNowOperationRun["status"]) {
  if (status === "Concluído") return "secondary" as const
  if (status === "Falha") return "destructive" as const
  return "outline" as const
}

export function AccessOperationsTable({ groups, runs, canProcess, onProcess }: AccessOperationsTableProps) {
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [confirmationGroupIds, setConfirmationGroupIds] = useState<string[]>([])
  const eligibleGroups = useMemo(() => groups.filter((group) => {
    const status = getRunStatus(group, runs[group.id])
    return status !== "Concluído" && status !== "Processando"
  }), [groups, runs])
  const selectedEligibleGroups = eligibleGroups.filter((group) => selectedGroupIds.includes(group.id))
  const confirmationGroups = groups.filter((group) => confirmationGroupIds.includes(group.id))
  const grantCount = confirmationGroups.filter((group) => group.operation === "concessao").length
  const revokeCount = confirmationGroups.length - grantCount
  const allEligibleSelected = eligibleGroups.length > 0 && selectedEligibleGroups.length === eligibleGroups.length

  function requestConfirmation(groupIds: string[]) {
    setConfirmationGroupIds(groupIds)
    setConfirmationOpen(true)
  }

  function toggleGroup(groupId: string, selected: boolean) {
    setSelectedGroupIds((current) => selected ? [...new Set([...current, groupId])] : current.filter((id) => id !== groupId))
  }

  async function confirmProcessing() {
    const groupIds = confirmationGroupIds
    setConfirmationOpen(false)
    setSelectedGroupIds((current) => current.filter((id) => !groupIds.includes(id)))
    await onProcess(groupIds)
  }

  return (
    <>
      <Card id="operacoes-acesso" className="overflow-hidden rounded-xl border-border/70 py-0 shadow-sm">
        <CardHeader className="sigac-section-header gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheckIcon aria-hidden="true" className="size-4 text-primary" />Acessos por grupo</CardTitle>
            <CardDescription>Compare o acesso informado com o resultado solicitado e processe em lote ou individualmente.</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit">{groups.length} grupos</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {groups.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Este RITM não possui grupos de acesso para processar.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="w-12">
                      <Checkbox aria-label="Selecionar todos os grupos pendentes" aria-checked={selectedEligibleGroups.length > 0 && !allEligibleSelected ? "mixed" : allEligibleSelected} checked={allEligibleSelected} disabled={!canProcess || eligibleGroups.length === 0} onCheckedChange={(checked) => setSelectedGroupIds(checked ? eligibleGroups.map((group) => group.id) : [])} />
                    </TableHead>
                    <TableHead>Grupo e pessoas</TableHead>
                    <TableHead>Acesso atual</TableHead>
                    <TableHead>Após a operação</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => {
                    const run = runs[group.id]
                    const status = getRunStatus(group, run)
                    const isGrant = group.operation === "concessao"
                    const currentAccess = status === "Concluído" ? isGrant ? "Com acesso" : "Sem acesso" : group.currentAccess
                    const isEligible = status !== "Concluído" && status !== "Processando"
                    const OperationIcon = isGrant ? ArrowUpFromLineIcon : ArrowDownToLineIcon
                    return (
                      <TableRow key={group.id}>
                        <TableCell>
                          <Checkbox aria-label={`Selecionar grupo ${group.name}`} checked={selectedGroupIds.includes(group.id)} disabled={!canProcess || !isEligible} onCheckedChange={(checked) => toggleGroup(group.id, checked === true)} />
                        </TableCell>
                        <TableCell className="min-w-64">
                          <p className="break-all font-mono text-xs font-semibold leading-5">{group.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{group.members} pessoas · {group.permission}</p>
                        </TableCell>
                        <TableCell><Badge variant="outline">{currentAccess}</Badge></TableCell>
                        <TableCell><Badge variant={isGrant ? "secondary" : "outline"}>{isGrant ? "Com acesso" : "Sem acesso"}</Badge></TableCell>
                        <TableCell><span className="inline-flex items-center gap-2 text-sm"><OperationIcon aria-hidden="true" className="size-4 text-primary" />{isGrant ? "Concessão" : "Revogação"}</span></TableCell>
                        <TableCell className="min-w-36">
                          <div className="flex flex-col items-start gap-1.5">
                            <Badge variant={getStatusVariant(status)}>{status === "Processando" ? <LoaderCircleIcon aria-hidden="true" className="mr-1 size-3.5 animate-spin" /> : status === "Falha" ? <CircleAlertIcon aria-hidden="true" className="mr-1 size-3.5" /> : null}{status}</Badge>
                            {run?.attempts ? <span className="text-[11px] text-muted-foreground">Tentativa {run.attempts}{run.failureCategory ? ` · ${run.failureCategory}` : ""}</span> : null}
                            {run?.message && status === "Falha" ? <span className="max-w-52 text-xs leading-5 text-destructive">{run.message}</span> : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {status === "Concluído" ? <span className="text-xs font-medium text-muted-foreground">Concluído</span> : (
                            <Button variant={status === "Falha" ? "outline" : "ghost"} size="sm" disabled={!canProcess || status === "Processando"} onClick={() => requestConfirmation([group.id])} aria-label={`${status === "Falha" ? "Reprocessar" : "Processar"} ${group.name}`}>
                              {status === "Falha" ? <RefreshCwIcon data-icon="inline-start" /> : <OperationIcon data-icon="inline-start" />}
                              {status === "Falha" ? "Reprocessar" : "Processar"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">Falhas permanecem visíveis para reprocessamento; ações concluídas ficam bloqueadas para evitar duplicidade.</p>
            <Button disabled={!canProcess || selectedEligibleGroups.length === 0} onClick={() => requestConfirmation(selectedEligibleGroups.map((group) => group.id))}>
              <ShieldCheckIcon data-icon="inline-start" />Processar selecionados{selectedEligibleGroups.length ? ` (${selectedEligibleGroups.length})` : ""}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent size="default" className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar processamento de acessos?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationGroups.length} grupo(s): {grantCount} concessão(ões) e {revokeCount} revogação(ões). A operação seguirá o que foi solicitado no RITM.
            </AlertDialogDescription>
            <p className="text-xs leading-5 text-muted-foreground">No ambiente atual, o resultado é apenas demonstrativo: nada será enviado ao ServiceNow nem ao diretório.</p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationGroupIds([])}>Revisar</AlertDialogCancel>
            <AlertDialogAction disabled={confirmationGroups.length === 0 || !canProcess} onClick={() => void confirmProcessing()}>
              Confirmar processamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
