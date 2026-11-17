"use client"

import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { toast } from "sonner"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
} from "@/lib/api-client"

const accessLevels = ["leitura", "escrita", "administrador"]

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
  const [groupId, setGroupId] = useState("")
  const [accessLevel, setAccessLevel] = useState("leitura")
  const [saving, setSaving] = useState(false)

  async function addGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!groupName.trim() || !groupId.trim()) return
    setSaving(true)
    try {
      await addProjectAccessGroup(projectId, {
        groupName: groupName.trim(),
        groupId: groupId.trim(),
        accessLevel,
      })
      setGroupName("")
      setGroupId("")
      await mutate()
      await mutateCache(["project-access-map", projectId])
      toast.success("Grupo associado à área de rede.")
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

  async function changeLevel(id: string, level: string) {
    try {
      await updateProjectAccessGroup(projectId, id, level)
      await mutate()
      await mutateCache(["project-access-map", projectId])
      toast.success("Nível de acesso atualizado.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o grupo."
      )
    }
  }

  async function removeGroup(id: string) {
    try {
      await deleteProjectAccessGroup(projectId, id)
      await mutate()
      await mutateCache(["project-access-map", projectId])
      toast.success("Grupo removido da área de rede.")
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
          Grupos cadastrados
        </h3>
        <p className="text-sm text-muted-foreground">
          Os grupos desta lista vêm de project_access_groups e aparecem no mapa
          e nos relatórios.
        </p>
      </div>
      <form
        onSubmit={addGroup}
        className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end"
      >
        <Field>
          <FieldLabel htmlFor="managed-group-name">Nome do grupo</FieldLabel>
          <Input
            id="managed-group-name"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Nome do grupo"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="managed-group-id">ID Entra ID</FieldLabel>
          <Input
            id="managed-group-id"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            placeholder="Object ID"
            maxLength={36}
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
          disabled={saving || !groupName.trim() || !groupId.trim()}
        >
          <PlusIcon data-icon="inline-start" />
          Adicionar grupo
        </Button>
      </form>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando grupos...</p>
      ) : data?.groups.length ? (
        <div className="flex flex-col gap-2">
          {data.groups.map((group) => (
            <div
              key={group.id}
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
                <Badge variant="secondary">{group.source}</Badge>
                <Select
                  value={group.accessLevel}
                  onValueChange={(level) =>
                    level && changeLevel(group.id, level)
                  }
                >
                  <SelectTrigger
                    aria-label={`Nível de ${group.groupName}`}
                    className="w-36"
                  >
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeGroup(group.id)}
                  aria-label={`Remover ${group.groupName}`}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum grupo armazenado nesta área.
        </p>
      )}
    </section>
  )
}
