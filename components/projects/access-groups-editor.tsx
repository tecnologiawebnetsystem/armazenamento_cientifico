"use client"

import { useState } from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProjectAccessGroupInput } from "@/lib/api-client"

const accessLevels = [
  { value: "leitura", label: "Leitura" },
  { value: "escrita", label: "Escrita" },
  { value: "administrador", label: "Administrador" },
]

export function AccessGroupsEditor({
  value,
  onChange,
}: {
  value: ProjectAccessGroupInput[]
  onChange: (groups: ProjectAccessGroupInput[]) => void
}) {
  const [groupName, setGroupName] = useState("")
  const [groupId, setGroupId] = useState("")
  const [accessLevel, setAccessLevel] = useState("leitura")

  function addGroup() {
    const cleanName = groupName.trim()
    const cleanId = groupId.trim()
    if (
      !cleanName ||
      !cleanId ||
      value.some(
        (group) => group.groupId.toLowerCase() === cleanId.toLowerCase()
      )
    )
      return
    onChange([
      ...value,
      { groupName: cleanName, groupId: cleanId, accessLevel },
    ])
    setGroupName("")
    setGroupId("")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
        <Field>
          <FieldLabel htmlFor="access-group-name">Nome do grupo</FieldLabel>
          <Input
            id="access-group-name"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Ex.: ARMAZENAMENTO-PESQUISA-READ"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="access-group-id">
            ID do grupo no Entra ID
          </FieldLabel>
          <Input
            id="access-group-id"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            placeholder="Object ID do grupo"
            maxLength={36}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="access-group-level">Nível de acesso</FieldLabel>
          <Select
            value={accessLevel}
            onValueChange={(next) => setAccessLevel(next ?? "leitura")}
          >
            <SelectTrigger id="access-group-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {accessLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Button
          type="button"
          variant="outline"
          onClick={addGroup}
          disabled={!groupName.trim() || !groupId.trim()}
        >
          <PlusIcon data-icon="inline-start" />
          Adicionar
        </Button>
      </div>
      <FieldDescription>
        Cadastre cada grupo separadamente. O ID do Entra ID permite identificar
        o grupo sem depender apenas do nome.
      </FieldDescription>
      {value.length > 0 ? (
        <div className="flex flex-col gap-2" aria-label="Grupos cadastrados">
          {value.map((group) => (
            <div
              key={group.groupId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {group.groupName}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {group.groupId}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {accessLevels.find(
                    (level) => level.value === group.accessLevel
                  )?.label ?? group.accessLevel}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onChange(
                      value.filter((item) => item.groupId !== group.groupId)
                    )
                  }
                  aria-label={`Remover grupo ${group.groupName}`}
                >
                  <XIcon />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum grupo de acesso adicionado.
        </p>
      )}
    </div>
  )
}
