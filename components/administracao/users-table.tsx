"use client"

import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUsers } from "@/hooks/use-users"
import { roleLabel } from "@/hooks/use-permissions"
import { updateUserRole, ApiError } from "@/lib/api-client"
import type { Role } from "@/lib/types"

const allRoles: Role[] = ["admin", "gestor", "participante", "visualizador"]

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}

export function UsersTable({ currentUserId }: { currentUserId: string }) {
  const { users, isLoading, refresh } = useUsers()

  async function handleRoleChange(userId: string, role: Role) {
    try {
      await updateUserRole(userId, role)
      toast.success("Papel do usuário atualizado.")
      refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível atualizar o papel do usuário."
      toast.error(message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todos os usuários</CardTitle>
        <CardDescription>{users.length} usuários cadastrados na plataforma.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Papel global</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.nome} /> : null}
                        <AvatarFallback className="text-xs">{initials(u.nome)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{u.nome}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.area}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.cargo}</TableCell>
                  <TableCell>
                    {u.id === currentUserId ? (
                      <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                        {roleLabel(u.role)} (você)
                      </Badge>
                    ) : (
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as Role)}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {allRoles.map((r) => (
                              <SelectItem key={r} value={r}>
                                {roleLabel(r)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
