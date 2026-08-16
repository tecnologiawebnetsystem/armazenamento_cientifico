"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2Icon, XIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { shareFileNode, unshareFileNode, ApiError } from "@/lib/api-client"
import { shareLevelLabel } from "@/hooks/use-permissions"
import type { FileNode, ShareLevel, User } from "@/lib/types"

const shareLevels: ShareLevel[] = ["leitura", "edicao", "proprietario"]

export function FileShareDialog({
  file,
  users,
  open,
  onOpenChange,
  onChanged,
}: {
  file: FileNode | null
  users: User[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedLevel, setSelectedLevel] = useState<ShareLevel>("leitura")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableUsers = useMemo(
    () => users.filter((u) => !file?.compartilhamentos.some((s) => s.userId === u.id)),
    [users, file],
  )

  if (!file) return null

  async function handleShare() {
    if (!selectedUserId) return
    setIsSubmitting(true)
    try {
      await shareFileNode(file.id, selectedUserId, selectedLevel)
      toast.success("Item compartilhado.")
      setSelectedUserId("")
      setSelectedLevel("leitura")
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível compartilhar o item.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUnshare(userId: string) {
    try {
      await unshareFileNode(file.id, userId)
      toast.success("Compartilhamento removido.")
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível remover o compartilhamento.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="truncate">Compartilhar &quot;{file.nome}&quot;</DialogTitle>
          <DialogDescription>Defina quem pode acessar este item e com qual nível de permissão.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? "")}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel((v as ShareLevel) ?? "leitura")}>
              <SelectTrigger className="w-40 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {shareLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {shareLevelLabel(level)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleShare} disabled={!selectedUserId || isSubmitting} size="sm" className="self-end">
            {isSubmitting && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
            Compartilhar
          </Button>

          <div className="flex flex-col gap-2 border-t pt-3">
            <span className="text-xs font-medium text-muted-foreground">Pessoas com acesso</span>
            {file.compartilhamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum compartilhamento adicional ainda.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {file.compartilhamentos.map((s) => {
                  const targetUser = users.find((u) => u.id === s.userId)
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded-md px-1 py-1 text-sm">
                      <span className="min-w-0 flex-1 truncate text-foreground">{targetUser?.nome ?? s.userId}</span>
                      <Badge variant="outline">{shareLevelLabel(s.nivel)}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => handleUnshare(s.userId)}
                        aria-label={`Remover compartilhamento com ${targetUser?.nome ?? s.userId}`}
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
