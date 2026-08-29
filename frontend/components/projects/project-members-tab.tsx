"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { MoreVerticalIcon, UserPlusIcon, Loader2Icon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useProjectMembers } from "@/hooks/use-project-members"
import { useUsers } from "@/hooks/use-users"
import { addProjectMember, removeProjectMember, updateProjectMember, ApiError } from "@/lib/api-client"
import { roleLabel } from "@/hooks/use-permissions"
import type { Role } from "@/lib/types"

const assignableRoles: Role[] = ["gestor", "participante", "visualizador"]

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}

export function ProjectMembersTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { members, isLoading, error, refresh } = useProjectMembers(projectId)
  const { users } = useUsers()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedRole, setSelectedRole] = useState<Role>("participante")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableUsers = useMemo(
    () => users.filter((u) => !members.some((m) => m.userId === u.id)),
    [users, members],
  )

  async function handleAdd() {
    if (!selectedUserId) return
    setIsSubmitting(true)
    try {
      await addProjectMember(projectId, selectedUserId, selectedRole)
      toast.success("Membro adicionado ao projeto.")
      refresh()
      setDialogOpen(false)
      setSelectedUserId("")
      setSelectedRole("participante")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível adicionar o membro."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRoleChange(userId: string, papel: Role) {
    try {
      await updateProjectMember(projectId, userId, papel)
      toast.success("Papel atualizado.")
      refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível atualizar o papel."
      toast.error(message)
    }
  }

  async function handleRemove(userId: string) {
    try {
      await removeProjectMember(projectId, userId)
      toast.success("Membro removido do projeto.")
      refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível remover o membro."
      toast.error(message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membros e permissões</CardTitle>
        <CardDescription>Gerencie quem participa do projeto e o papel de cada pessoa.</CardDescription>
        {canManage && (
          <CardAction>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <UserPlusIcon data-icon="inline-start" />
                Adicionar membro
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar membro</DialogTitle>
                  <DialogDescription>Selecione um usuário e defina o papel dele neste projeto.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nome} · {u.area}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {assignableRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabel(r)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAdd} disabled={!selectedUserId || isSubmitting}>
                    {isSubmitting && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {error ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Não foi possível carregar os membros</EmptyTitle>
              <EmptyDescription>Verifique a conexão com a API e tente novamente.</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => refresh()}>Tentar novamente</Button>
          </Empty>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserPlusIcon />
              </EmptyMedia>
              <EmptyTitle>Nenhum membro cadastrado</EmptyTitle>
              <EmptyDescription>Adicione pesquisadores para que possam acessar este projeto.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-1">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-9">
                    {member.user.avatarUrl ? (
                      <AvatarImage src={member.user.avatarUrl} alt={member.user.nome} />
                    ) : null}
                    <AvatarFallback>{initials(member.user.nome)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{member.user.nome}</span>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-xs text-muted-foreground">{member.user.cargo}</span>
                      <Badge className="border-petrobras-yellow/50 bg-petrobras-yellow/15 text-foreground" variant="outline">{roleLabel(member.papel)}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
                        <MoreVerticalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {assignableRoles.filter((r) => r !== member.papel).map((r) => (
                          <DropdownMenuItem key={r} onClick={() => handleRoleChange(member.userId, r)}>
                            Definir como {roleLabel(r)}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => handleRemove(member.userId)}>
                          Remover do projeto
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
