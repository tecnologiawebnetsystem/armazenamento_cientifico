"use client"

import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { toast } from "sonner"
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
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
const principalTypes = [
  { value: "group", label: "Grupo Entra ID" },
  { value: "role", label: "Role" },
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
      toast.success("Grupo ou role atualizado.")
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
        <h3 id="project-access-groups-title" className="font-semibold">
          Grupos e roles cadastrados
        </h3>
        <p className="text-sm text-muted-foreground">
          Selecione sugestões do catálogo ou informe um novo principal. Cada
          item é salvo em project_groups e vinculado à área em project_access_groups.
        </p>
      </div>
      <form
        onSubmit={addGroup}
        className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_180px_auto] md:items-end"
      >
        <Field>
          <FieldLabel htmlFor="managed-principal-type">Tipo</FieldLabel>
          <Select
            value={principalType}
            onValueChange={(value) =>
              setPrincipalType((value as "group" | "role") ?? "group")
            }
          >
            <SelectTrigger id="managed-principal-type">
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
          <FieldLabel htmlFor="managed-group-name">
            Nome do {principalType === "group" ? "grupo" : "role"}
          </FieldLabel>
          <Input
            id="managed-group-name"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Nome do grupo ou role"
            required
          />
        </Field>
        <PrincipalIdentifierAutocomplete
          id="managed-group-id"
          principalType={principalType}
          value={identifier}
          onChange={setIdentifier}
          onSelect={setGroupName}
        />
        <Field>
          <FieldLabel htmlFor="managed-group-level">Nível</FieldLabel>
          <Select
            value={accessLevel}
            onValueChange={(value) => setAccessLevel(value ?? "leitura")}
          >
            <SelectTrigger id="managed-group-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {accessLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Button
          type="submit"
          disabled={saving || !groupName.trim() || !identifier.trim()}
        >
          <PlusIcon data-icon="inline-start" />
          Adicionar principal
        </Button>
      </form>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando principals...</p>
      ) : data?.groups.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.groups.map((group) => {
            const isEditing = editingId === group.id && draft !== null
            return (
              <article
                key={group.id}
                className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-background p-4"
              >
                {isEditing ? (
                  <div className="grid gap-3">
                    <Field>
                      <FieldLabel htmlFor={`edit-type-${group.id}`}>Tipo</FieldLabel>
                      <Select
                        value={draft.principalType}
                        onValueChange={(value) =>
                          value && setDraft({ ...draft, principalType: value as "group" | "role" })
                        }
                      >
                        <SelectTrigger id={`edit-type-${group.id}`}>
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
                      <FieldLabel htmlFor={`edit-name-${group.id}`}>Nome</FieldLabel>
                      <Input
                        id={`edit-name-${group.id}`}
                        value={draft.groupName}
                        onChange={(event) => setDraft({ ...draft, groupName: event.target.value })}
                        maxLength={256}
                      />
                    </Field>
                    <PrincipalIdentifierAutocomplete
                      id={`edit-identifier-${group.id}`}
                      principalType={draft.principalType}
                      value={draft.identifier}
                      onChange={(value) => setDraft({ ...draft, identifier: value })}
                      onSelect={(value) => setDraft({ ...draft, groupName: value })}
                    />
                    <Field>
                      <FieldLabel htmlFor={`edit-level-${group.id}`}>Nível de acesso</FieldLabel>
                      <Select
                        value={draft.accessLevel}
                        onValueChange={(value) => value && setDraft({ ...draft, accessLevel: value })}
                      >
                        <SelectTrigger id={`edit-level-${group.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {accessLevels.map((level) => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => { setEditingId(null); setDraft(null) }} disabled={saving}>
                        <XIcon data-icon="inline-start" /> Cancelar
                      </Button>
                      <Button type="button" size="sm" onClick={() => void saveEdit(group.id)} disabled={saving || !draft.groupName.trim() || !draft.identifier.trim()}>
                        <CheckIcon data-icon="inline-start" /> Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col">
                        <span className="break-words text-sm font-semibold">{group.groupName}</span>
                        <span className="break-all font-mono text-xs text-muted-foreground">{group.identifier}</span>
                      </div>
                      <Badge variant="secondary" className="shrink-0">{group.accessLevel}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {principalTypes.find((type) => type.value === group.principalType)?.label}
                        </Badge>
                        <Badge variant="outline">{group.source}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => beginEdit(group)} aria-label={`Editar ${group.groupName}`}>
                          <PencilIcon />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => void removeGroup(group.id)} aria-label={`Remover ${group.groupName}`}>
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
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum grupo ou role associado a esta área.
        </p>
      )}
    </section>
  )
}
