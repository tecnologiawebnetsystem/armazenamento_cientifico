"use client"

import useSWR from "swr"
import { CheckCircle2Icon, CircleAlertIcon, FolderKeyIcon, ShieldCheckIcon, UsersIcon, XCircleIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { getProjectAccessMap } from "@/lib/api-client"
import { roleLabel } from "@/hooks/use-permissions"

function initials(nome?: string | null, userId?: string | null) {
  const normalizedName = nome?.trim() || userId?.trim() || "Usuário"
  return normalizedName.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase() || "U"
}

function displayedRole(value: unknown) {
  const normalized = String(value ?? "").toLowerCase()
  if (["gestor", "gerente", "manager"].includes(normalized)) return "gerente"
  if (["participante", "participant"].includes(normalized)) return "solicitante"
  if (["visualizador", "viewer"].includes(normalized)) return "visualizador"
  return normalized
}

const permissionLabels: Record<string, string> = {
  FullControl: "Controle total", Modify: "Modificar", ReadAndExecute: "Ler e executar",
  ListDirectory: "Listar conteúdo", Read: "Leitura", Write: "Gravação", Delete: "Excluir",
}

function permissionLabel(permission: string) {
  return permissionLabels[permission] || permission.replaceAll("FileSystemRights.", "")
}

export function ProjectMembersTab({ projectId }: { projectId: string; canManage?: boolean }) {
  const { data, isLoading, error, mutate } = useSWR(["project-access-map", projectId], () => getProjectAccessMap(projectId))
  const members = data?.members ?? []
  const groups = data?.groups ?? []
  const acl = data?.acl

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-petrobras-green text-primary-foreground"><ShieldCheckIcon className="size-5" aria-hidden="true" /></div>
            <div className="flex flex-col gap-1"><CardTitle className="text-xl tracking-tight">Membros e mapa de acessos</CardTitle><CardDescription>Usuários, grupos e permissões da pasta mãe configurada e das subpastas imediatas.</CardDescription></div>
          </div>
          <div className="flex items-center gap-2"><Badge variant="secondary">{groups.length} {groups.length === 1 ? "grupo" : "grupos"}</Badge><Badge variant="secondary">{acl?.entries.length ?? 0} ACLs</Badge></div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-5 py-6 sm:px-7">
        {error ? <Empty><EmptyHeader><EmptyTitle>Não foi possível carregar o mapa de acessos</EmptyTitle><EmptyDescription>A API não respondeu. Tente novamente.</EmptyDescription></EmptyHeader><Button variant="outline" onClick={() => mutate()}>Tentar novamente</Button></Empty> : isLoading ? <div className="flex flex-col gap-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-lg" />)}</div> : <>
          <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-background p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><FolderKeyIcon className="mt-0.5 size-5 text-petrobras-green" /><div><p className="font-semibold">Permissões da pasta mãe (somente esta pasta)</p><p className="break-all text-xs text-muted-foreground">{acl?.path || "Caminho não configurado"}</p></div></div><Badge variant={acl?.status === "consultado" ? "secondary" : "outline"}>{acl?.status === "consultado" ? "Consulta realizada" : "Consulta indisponível"}</Badge></div>
            {acl?.message && <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground"><CircleAlertIcon className="mt-0.5 size-4 shrink-0" />{acl.message}</div>}
          </div>
          {acl?.subfolders?.length ? <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-background p-4"><div><p className="font-semibold">Permissões das subpastas</p><p className="text-xs text-muted-foreground">Usuários e grupos encontrados nas subpastas imediatas da pasta mãe.</p></div><div className="flex flex-col gap-3">{acl.subfolders.map((folder) => <details key={folder.path} className="rounded-lg border border-border/70"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">{folder.name}<span className="ml-2 text-xs font-normal text-muted-foreground">{folder.entries.length} ACLs</span></summary><div className="border-t border-border/70 px-4 py-3"><p className="mb-3 break-all text-xs text-muted-foreground">{folder.path}</p>{folder.entries.length ? <div className="flex flex-col divide-y divide-border">{folder.entries.map((entry) => <div key={`${folder.path}-${entry.principal}-${entry.accessType}-${entry.permissions.join("-")}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{entry.principal}</p><p className="text-xs text-muted-foreground">{entry.inherited ? "herdada" : "direta"} · {entry.accessType === "deny" ? "Negar" : "Permitir"}</p></div><div className="flex flex-wrap gap-1">{entry.permissions.map((permission) => <Badge key={permission} variant="outline" className="text-xs">{permissionLabel(permission)}</Badge>)}</div></div>)}</div> : <p className="text-sm text-muted-foreground">Nenhuma ACL foi retornada para esta subpasta.</p>}</div></details>)}</div></div> : null}
          <div className="grid gap-3 sm:grid-cols-2">{groups.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><UsersIcon /></EmptyMedia><EmptyTitle>Nenhum grupo retornado</EmptyTitle><EmptyDescription>Não há grupos associados ao projeto.</EmptyDescription></EmptyHeader></Empty> : groups.map((group) => <div key={`${group.fonte}-${group.nome}`} className="rounded-xl border border-border/80 bg-background p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{group.nome}</p><p className="text-xs text-muted-foreground">Fonte: {group.fonte}</p></div><Badge variant="outline">{group.nivel}</Badge></div><p className="mt-3 text-xs text-muted-foreground">{group.identificadores.length} identificador(es) consolidado(s)</p></div>)}</div>
          <div className="overflow-hidden rounded-xl border border-border/80 bg-background"><div className="hidden grid-cols-[minmax(0,1fr)_180px_160px] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid"><span>Usuário ou grupo</span><span>Permissões</span><span>Origem</span></div>{acl?.entries.length ? <div className="flex flex-col divide-y divide-border">{acl.entries.map((entry) => <div key={`${entry.principal}-${entry.accessType}-${entry.permissions.join("-")}`} className="flex flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_180px_160px] sm:items-center"><div className="flex min-w-0 items-center gap-3"><Avatar className="size-9"><AvatarFallback>{initials(entry.principal)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium">{entry.principal}</p><p className="text-xs text-muted-foreground">{entry.principalType} · {entry.inherited ? "herdada" : "direta"}</p></div></div><div className="flex flex-wrap gap-1">{entry.permissions.map((permission) => <Badge key={permission} variant="outline" className="text-xs">{permissionLabel(permission)}</Badge>)}</div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className={entry.accessType === "deny" ? "text-destructive" : "text-petrobras-green"}>{entry.accessType === "deny" ? <XCircleIcon className="inline size-4" /> : <CheckCircle2Icon className="inline size-4" />}</span>{entry.accessType === "deny" ? "Negar" : "Permitir"}</div></div>)}</div> : <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma ACL foi retornada para esta pasta.</p>}</div>
          <div className="overflow-hidden rounded-xl border border-border/80 bg-background"><div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Membros vinculados ao projeto</div><div className="flex flex-col divide-y divide-border">{members.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum membro individual retornado.</p> : members.map((member) => <div key={member.userId} className="flex items-center justify-between gap-3 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><Avatar className="size-9">{member.user.avatarUrl ? <AvatarImage src={member.user.avatarUrl} alt={member.user.nome} /> : null}<AvatarFallback>{initials(member.user.nome, member.user.userId || member.userId)}</AvatarFallback></Avatar><div className="min-w-0"><span className="block truncate text-sm font-medium">{member.user.nome || member.user.userId || member.userId}</span><span className="block truncate text-xs text-muted-foreground">{member.user.email || `Identificador: ${member.user.userId || member.userId}`}</span></div></div><Badge variant="outline">{roleLabel(displayedRole(member.papel))}</Badge></div>)}</div></div>
          {data && <p className="text-xs text-muted-foreground">Fonte: {data.source} · Consultado em {new Date(data.consultedAt).toLocaleString("pt-BR")}</p>}
        </>}
      </CardContent>
    </Card>
  )
}
