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
import { PrincipalIdentifierAutocomplete } from "@/components/projects/principal-identifier-autocomplete"

const principalTypes = [
  { value: "group", label: "Grupo Entra ID" },
  { value: "role", label: "Role" },
] as const

const accessLevels = [
  { value: "leitura", label: "Leitura" },
  { value: "escrita", label: "Escrita" },
]

export function AccessGroupsEditor({
  value,
  onChange,
}: {
  value: ProjectAccessGroupInput[]
  onChange: (groups: ProjectAccessGroupInput[]) => void
}) {
  const [groupName, setGroupName] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [principalType, setPrincipalType] = useState<"group" | "role">("group")
  const [accessLevel, setAccessLevel] = useState("leitura")

  function addGroup() {
    const cleanName = groupName.trim()
    const cleanIdentifier = identifier.trim()
    if (
      !cleanName ||
      !cleanIdentifier ||
      value.some(
        (group) =>
          group.principalType === principalType &&
          group.identifier.toLowerCase() === cleanIdentifier.toLowerCase() &&
          group.accessLevel === accessLevel
      )
    )
      return
    onChange([
      ...value,
      {
        groupName: cleanName,
        identifier: cleanIdentifier,
        principalType,
        accessLevel,
      },
    ])
    setGroupName("")
    setIdentifier("")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_180px_auto] md:items-end">
        <Field>
          <FieldLabel htmlFor="access-principal-type">Tipo</FieldLabel>
          <Select
            value={principalType}
            onValueChange={(next) =>
              setPrincipalType((next as "group" | "role") ?? "group")
            }
          >
            <SelectTrigger id="access-principal-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {principalTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="access-group-name">
            Nome do {principalType === "group" ? "grupo" : "role"}
          </FieldLabel>
          <Input
            id="access-group-name"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Ex.: ARMAZENAMENTO-PESQUISA-READ"
          />
        </Field>
        <PrincipalIdentifierAutocomplete
          id="access-group-id"
          principalType={principalType}
          value={identifier}
          onChange={setIdentifier}
          onSelect={setGroupName}
        />
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
          disabled={!groupName.trim() || !identifier.trim()}
        >
          <PlusIcon data-icon="inline-start" />
          Adicionar
        </Button>
      </div>
      <FieldDescription>
        Cadastre cada grupo ou role separadamente. O identificador externo
        distingue principals com nomes semelhantes.
      </FieldDescription>
      {value.length > 0 ? (
        <div className="flex flex-col gap-2" aria-label="Principals cadastrados">
          {value.map((group) => (
            <div
              key={`${group.principalType}-${group.identifier}-${group.accessLevel}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {group.groupName}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {group.identifier}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {principalTypes.find(
                    (type) => type.value === group.principalType
                  )?.label}
                </Badge>
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
                      value.filter(
                        (item) =>
                          item.principalType !== group.principalType ||
                          item.identifier !== group.identifier ||
                          item.accessLevel !== group.accessLevel
                      )
                    )
                  }
                  aria-label={`Remover ${group.principalType === "group" ? "grupo" : "role"} ${group.groupName}`}
                >
                  <XIcon />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum grupo ou role de acesso adicionado.
        </p>
      )}
    </div>
  )
}
