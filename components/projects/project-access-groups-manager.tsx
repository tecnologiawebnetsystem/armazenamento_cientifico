"use client"

import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { toast } from "sonner"
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PrincipalIdentifierAutocomplete } from "@/components/projects/principal-identifier-autocomplete"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  addProjectAccessGroup,
  deleteProjectAccessGroup,
  getProjectAccessGroups,
  updateProjectAccessGroup,
  type ProjectAccessGroupInput,
} from "@/lib/api-client"

const accessLevels = ["leitura", "escrita", "administrador"]
const accessLevelLabels: Record<string, string> = {
  leitura: "Leitura",
  escrita: "Edição",
  administrador: "Administração",
}
const principalTypes = [
  { value: "group", label: "Grupo do Entra ID" },
  { value: "role", label: "Papel da aplicação" },
] as const

export function ProjectAccessGroupsManager({
  projectId,
}: {
  projectId: string
}) {
  const { data, isLoading, mutate } = useSWR(
    ["project-access-groups", projectId],
    () => getProjectAccessGroups(projectId)
  )
  const { mutate: mutateCache } = useSWRConfig()
  const [groupName, setGroupName] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [principalType, setPrincipalType] = useState<"group" | "role">("group")
  const [accessLevel, setAccessLevel] = useState("leitura")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProjectAccessGroupInput | null>(null)
  const [saving, setSaving] = useState(false)

  async function refreshGroups() {
    await mutate()
    await mutateCache(["project-access-map", projectId])
  }

  async function addGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!groupName.trim() || !identifier.trim()) return
    setSaving(true)
    try {
      await addProjectAccessGroup(projectId, {
        groupName: groupName.trim(),
        identifier: identifier.trim(),
        principalType,
        accessLevel,
      })
      setGroupName("")
      setIdentifier("")
      await refreshGroups()
      toast.success("Principal associado à área de rede.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível associar o grupo."
      )
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(group: NonNullable<typeof data>["groups"][number]) {
    setEditingId(group.id)
    setDraft({
      groupName: group.groupName,
      identifier: group.identifier,
      principalType: group.principalType,
      accessLevel: group.accessLevel,
    })
  }

  async function saveEdit(groupId: string) {
    if (!draft?.groupName.trim() || !draft.identifier.trim()) return
    setSaving(true)
    try {
      await updateProjectAccessGroup(projectId, groupId, {
        ...draft,
        groupName: draft.groupName.trim(),
        identifier: draft.identifier.trim(),
      })
      setEditingId(null)
      setDraft(null)
      await refreshGroups()
      toast.success("Grupo ou papel atualizado.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o principal."
      )
    } finally {
      setSaving(false)
    }
  }

  async function removeGroup(id: string) {
    try {
      await deleteProjectAccessGroup(projectId, id)
      await refreshGroups()
      toast.success("Principal removido da área de rede.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o grupo."
      )
    }
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-border p-4"
      aria-labelledby="project-access-groups-title"
    >
      <div>
        <h3
          id="project-access-groups-title"
          className="font-semibold text-primary"
        >
          Gerenciar grupos e papéis
        </h3>
        <p className="text-sm text-muted-foreground">
          Adicione um grupo ou papel e defina o nível de acesso.
        </p>
      </div>
      <form
        onSubmit={addGroup}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <Field>
          <FieldLabel htmlFor="managed-principal-type">
            Tipo de acesso
          </FieldLabel>
          <Select
            value={principalType}
            onValueChange={(value) =>
              setPrincipalType((value as "group" | "role") ?? "group")
            }
          >
            <SelectTrigger id="managed-principal-type">
              <SelectValue>
                {
                  principalTypes.find((type) => type.value === principalType)
                    ?.label
                }
              </SelectValue>
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
        <PrincipalIdentifierAutocomplete
          id="managed-group-id"
          principalType={principalType}
          value={identifier}
          onChange={setIdentifier}
          onSelect={setGroupName}
        />
        <Field>
          <FieldLabel htmlFor="managed-group-name">Nome</FieldLabel>
          <Input
            id="managed-group-name"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder={
              principalType === "group"
                ? "Ex.: Grupo de Pesquisa"
                : "Ex.: editor"
            }
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="managed-group-level">Nível</FieldLabel>
          <Select
            value={accessLevel}
            onValueChange={(value) => setAccessLevel(value ?? "leitura")}
          >
            <SelectTrigger id="managed-group-level">
              <SelectValue>
                {accessLevelLabels[accessLevel] ?? accessLevel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {accessLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {accessLevelLabels[level]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Button
          type="submit"
          className="md:col-span-2 md:justify-self-end xl:col-span-2"
          disabled={saving || !groupName.trim() || !identifier.trim()}
        >
          <PlusIcon data-icon="inline-start" />
          Adicionar acesso
        </Button>
      </form>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          Carregando grupos cadastrados...
        </p>
      ) : data?.groups.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.groups.map((group) => {
            const isEditing = editingId === group.id && draft !== null
            return (
              <article
                key={group.id}
                className={`flex min-w-0 flex-col gap-3 rounded-lg border p-4 ${
                  group.principalType === "role"
                    ? "border-petrobras-blue/30 bg-petrobras-blue/5"
                    : "border-petrobras-green/30 bg-petrobras-green/5"
                }`}
              >
                {isEditing ? (
                  <div className="grid gap-3">
                    <Field>
                      <FieldLabel htmlFor={`edit-type-${group.id}`}>
                        Tipo
                      </FieldLabel>
                      <Select
                        value={draft.principalType}
                        onValueChange={(value) =>
                          value &&
                          setDraft({
                            ...draft,
                            principalType: value as "group" | "role",
                          })
                        }
                      >
                        <SelectTrigger id={`edit-type-${group.id}`}>
                          <SelectValue>
                            {
                              principalTypes.find(
                                (type) => type.value === draft.principalType
                              )?.label
                            }
                          </SelectValue>
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
                    <PrincipalIdentifierAutocomplete
                      id={`edit-identifier-${group.id}`}
                      principalType={draft.principalType}
                      value={draft.identifier}
                      onChange={(value) =>
                        setDraft({ ...draft, identifier: value })
                      }
                      onSelect={(value) =>
                        setDraft({ ...draft, groupName: value })
                      }
                    />
                    <Field>
                      <FieldLabel htmlFor={`edit-name-${group.id}`}>
                        Nome
                      </FieldLabel>
                      <Input
                        id={`edit-name-${group.id}`}
                        value={draft.groupName}
                        onChange={(event) =>
                          setDraft({ ...draft, groupName: event.target.value })
                        }
                        maxLength={256}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`edit-level-${group.id}`}>
                        Nível de acesso
                      </FieldLabel>
                      <Select
                        value={draft.accessLevel}
                        onValueChange={(value) =>
                          value && setDraft({ ...draft, accessLevel: value })
                        }
                      >
                        <SelectTrigger id={`edit-level-${group.id}`}>
                          <SelectValue>
                            {accessLevelLabels[draft.accessLevel] ??
                              draft.accessLevel}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {accessLevels.map((level) => (
                              <SelectItem key={level} value={level}>
                                {accessLevelLabels[level]}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null)
                          setDraft(null)
                        }}
                        disabled={saving}
                      >
                        <XIcon data-icon="inline-start" /> Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void saveEdit(group.id)}
                        disabled={
                          saving ||
                          !draft.groupName.trim() ||
                          !draft.identifier.trim()
                        }
                      >
                        <CheckIcon data-icon="inline-start" /> Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-semibold break-words">
                          {group.groupName}
                        </span>
                        <span className="font-mono text-xs break-all text-muted-foreground">
                          {group.identifier}
                        </span>
                      </div>
                      <Badge
                        className={`shrink-0 border ${
                          group.accessLevel === "administrador"
                            ? "border-petrobras-yellow/50 bg-petrobras-yellow/20 text-foreground"
                            : group.accessLevel === "escrita"
                              ? "border-petrobras-blue/25 bg-petrobras-blue/10 text-petrobras-blue"
                              : "border-petrobras-green/25 bg-petrobras-green/10 text-petrobras-green"
                        }`}
                      >
                        {accessLevelLabels[group.accessLevel] ??
                          group.accessLevel}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className={
                            group.principalType === "role"
                              ? "border-petrobras-blue/30 bg-petrobras-blue/10 text-petrobras-blue"
                              : "border-petrobras-green/30 bg-petrobras-green/10 text-petrobras-green"
                          }
                          variant="outline"
                        >
                          {
                            principalTypes.find(
                              (type) => type.value === group.principalType
                            )?.label
                          }
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => beginEdit(group)}
                          aria-label={`Editar ${group.groupName}`}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void removeGroup(group.id)}
                          aria-label={`Remover ${group.groupName}`}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
