"use client"

import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { toast } from "sonner"
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  addProjectMember,
  deleteProjectMember,
  getProjectMembers,
  searchProjectMemberCandidates,
  updateProjectMember,
  type ProjectMemberCandidate,
} from "@/lib/api-client"
import type { ProjectMemberRecord } from "@/lib/types"
import { roleLabel } from "@/hooks/use-permissions"

type MemberWithUser = ProjectMemberRecord

const accessRoles = [
  { value: "admin", label: "Administrador" },
  { value: "gerente", label: "Gerente" },
  { value: "responsavel", label: "Responsável" },
]

function profileName(role?: string | null, name?: string | null) {
  const normalized = String(role ?? "")
    .trim()
    .toLowerCase()
  if (["admin", "administrador", "administrator"].includes(normalized))
    return "Administrador"
  if (["gerente", "manager"].includes(normalized))
    return name?.trim() ? `${name.trim()} · Gerente` : "Gerente / Responsável"
  if (["responsavel", "responsável"].includes(normalized)) return "Responsável"
  return name?.trim() || (role ? roleLabel(role) : "Perfil não informado")
}

function accessRoleName(role?: string | null) {
  const value = String(role ?? "")
    .trim()
    .toLowerCase()
  return (
    accessRoles.find((item) => item.value === value)?.label ?? roleLabel(role)
  )
}

function initials(userId: string) {
  return userId.trim().slice(0, 2).toUpperCase() || "US"
}

export function ProjectMembersManager({
  projectId,
  canManage,
}: {
  projectId: string
  canManage: boolean
}) {
  const { data, isLoading, error, mutate } = useSWR(
    ["project-members", projectId],
    () => getProjectMembers(projectId)
  )
  const { mutate: mutateCache } = useSWRConfig()
  const [search, setSearch] = useState("")
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0)
  const [selected, setSelected] = useState<ProjectMemberCandidate | null>(null)
  const [newRole, setNewRole] = useState("responsavel")
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState("responsavel")
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const query = search.trim()
  const {
    data: candidates = [],
    isLoading: candidatesLoading,
    error: candidateError,
    mutate: refreshCandidates,
  } = useSWR(
    canManage && query.length >= 2 && !selected
      ? ["project-member-candidates", projectId, query]
      : null,
    () => searchProjectMemberCandidates(projectId, query),
    { keepPreviousData: true }
  )
  const members = data?.members ?? []

  async function refresh() {
    await mutate()
    await mutateCache(["project-access-map", projectId])
  }

  function selectCandidate(candidate: ProjectMemberCandidate) {
    setSelected(candidate)
    setSearch(candidate.userId)
    const candidateRole = String(candidate.perfilRole ?? "").toLowerCase()
    setNewRole(
      accessRoles.some((role) => role.value === candidateRole)
        ? candidateRole
        : "responsavel"
    )
  }

  async function addMember() {
    if (!selected) return
    setSaving(true)
    try {
      await addProjectMember(projectId, { userId: selected.id, papel: newRole })
      setSelected(null)
      setSearch("")
      await refresh()
      await refreshCandidates()
      toast.success("Pessoa adicionada à área de rede.")
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Não foi possível adicionar a pessoa."
      )
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(member: MemberWithUser) {
    setEditingUserId(member.user.id)
    const currentRole = String(member.papel ?? "responsavel").toLowerCase()
    setEditingRole(
      accessRoles.some((role) => role.value === currentRole)
        ? currentRole
        : "responsavel"
    )
    setConfirmingUserId(null)
  }

  async function saveEdit(userId: string) {
    setSaving(true)
    try {
      await updateProjectMember(projectId, userId, { papel: editingRole })
      setEditingUserId(null)
      await refresh()
      toast.success("Acesso da pessoa atualizado.")
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar o acesso."
      )
    } finally {
      setSaving(false)
    }
  }

  async function removeMember(userId: string) {
    setSaving(true)
    try {
      await deleteProjectMember(projectId, userId)
      setConfirmingUserId(null)
      setEditingUserId(null)
      await refresh()
      toast.success("Pessoa removida da área de rede.")
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Não foi possível remover a pessoa."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="project-members-title"
    >
      <div className="flex flex-col gap-1">
        <h3 id="project-members-title" className="text-base font-semibold">
          Pessoas com acesso
        </h3>
        <p className="text-sm text-muted-foreground">
          Gerencie quem tem acesso individual a esta área de rede.
        </p>
      </div>

      {canManage && (
        <div className="rounded-xl border border-petrobras-green/30 bg-petrobras-green/5 p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-petrobras-green/15 text-petrobras-green">
              <UserPlusIcon className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-semibold text-foreground">
                Adicionar pessoa à área
              </h4>
              <p className="text-sm text-muted-foreground">
                Busque pelo identificador, selecione o perfil e confirme a inclusão.
              </p>
            </div>
          </div>
          <Field>
            <FieldLabel htmlFor={`member-search-${projectId}`}>
              Buscar usuário pela chave de acesso
            </FieldLabel>
            <Input
              id={`member-search-${projectId}`}
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setActiveCandidateIndex(0)
                setSelected(null)
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || event.keyCode === 229)
                  return
                if (event.key === "ArrowDown" && candidates.length) {
                  event.preventDefault()
                  setActiveCandidateIndex(
                    (current) => (current + 1) % candidates.length
                  )
                } else if (event.key === "ArrowUp" && candidates.length) {
                  event.preventDefault()
                  setActiveCandidateIndex(
                    (current) =>
                      (current - 1 + candidates.length) % candidates.length
                  )
                } else if (
                  event.key === "Enter" &&
                  candidates[activeCandidateIndex]
                ) {
                  event.preventDefault()
                  selectCandidate(candidates[activeCandidateIndex])
                } else if (event.key === "Escape") {
                  setSearch("")
                  setSelected(null)
                }
              }}
              placeholder="Digite pelo menos 2 caracteres"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={!selected && query.length >= 2}
              aria-controls={`member-candidates-${projectId}`}
              aria-activedescendant={
                candidates[activeCandidateIndex]
                  ? `member-candidate-${candidates[activeCandidateIndex].id}`
                  : undefined
              }
              disabled={saving}
            />
          </Field>
          {!selected && query.length >= 2 && (
            <div
              id={`member-candidates-${projectId}`}
              role="listbox"
              aria-label="Sugestões de usuários"
              className="mt-2 flex max-h-60 flex-col overflow-y-auto rounded-lg border border-border bg-background"
            >
              {candidatesLoading ? (
                <p
                  className="px-3 py-3 text-sm text-muted-foreground"
                  role="status"
                >
                  Buscando usuários...
                </p>
              ) : candidateError ? (
                <p className="px-3 py-3 text-sm text-destructive" role="alert">
                  Não foi possível buscar usuários. Tente novamente.
                </p>
              ) : candidates.length ? (
                candidates.map((candidate, index) => (
                  <button
                    key={candidate.id}
                    id={`member-candidate-${candidate.id}`}
                    type="button"
                    role="option"
                    aria-selected={activeCandidateIndex === index}
                    onMouseEnter={() => setActiveCandidateIndex(index)}
                    onClick={() => selectCandidate(candidate)}
                    className={`flex items-center justify-between gap-4 border-b border-border px-3 py-3 text-left last:border-b-0 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none ${activeCandidateIndex === index ? "bg-muted/60" : ""}`}
                  >
                    <span className="min-w-0 truncate text-sm font-medium">
                      {candidate.userId}
                    </span>
                    <Badge variant="outline">
                      {profileName(candidate.perfilRole, candidate.perfilNome)}
                    </Badge>
                  </button>
                ))
              ) : (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  Nenhum usuário disponível com essa chave.
                </p>
              )}
            </div>
          )}
          {selected && (
            <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-end">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>{initials(selected.userId)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm font-semibold">
                    {selected.userId}
                  </span>
                  <Badge variant="secondary" className="w-fit">
                    {profileName(selected.perfilRole, selected.perfilNome)}
                  </Badge>
                </div>
              </div>
              <Field className="sm:w-48">
                <FieldLabel htmlFor={`new-member-role-${projectId}`}>
                  Papel de acesso
                </FieldLabel>
                <Select
                  value={newRole}
                  onValueChange={(value) => value && setNewRole(value)}
                >
                  <SelectTrigger id={`new-member-role-${projectId}`}>
                    <SelectValue>{accessRoleName(newRole)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {accessRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Button
                type="button"
                onClick={() => void addMember()}
                disabled={saving}
              >
                <PlusIcon data-icon="inline-start" /> Adicionar pessoa
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="hidden grid-cols-[minmax(0,1fr)_170px_170px_150px] items-center gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:grid">
          <span>Usuário</span>
          <span>Perfil cadastrado</span>
          <span>Papel nesta área</span>
          <span className="text-right">Ações</span>
        </div>
        {error ? (
          <div className="px-4 py-4 text-sm text-destructive" role="alert">
            Não foi possível carregar os membros. Atualize a página e tente
            novamente.
          </div>
        ) : isLoading ? (
          <div
            className="px-4 py-4 text-sm text-muted-foreground"
            role="status"
          >
            Carregando pessoas com acesso...
          </div>
        ) : members.length ? (
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const isEditing = editingUserId === member.user.id
              const isConfirmingRemoval = confirmingUserId === member.user.id
              const profile = member.user.perfilRole
              return (
                <li
                  key={member.user.id}
                  className="grid gap-3 px-3 py-3 sm:px-4 md:grid-cols-[minmax(0,1fr)_170px_170px_150px] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback>
                        {initials(member.user.userId || member.user.id)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {member.user.userId || member.user.id}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        Vinculado em{" "}
                        {new Date(member.adicionadoEm).toLocaleDateString(
                          "pt-BR"
                        )}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Badge variant="outline">
                      {profileName(profile, member.user.perfilNome)}
                    </Badge>
                  </div>
                  <div>
                    {isEditing ? (
                      <Select
                        value={editingRole}
                        onValueChange={(value) =>
                          value && setEditingRole(value)
                        }
                      >
                        <SelectTrigger
                          aria-label={`Papel de acesso de ${member.user.userId}`}
                        >
                          <SelectValue>
                            {accessRoleName(editingRole)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {accessRoles.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">
                        {accessRoleName(member.papel)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {canManage && isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingUserId(null)}
                          disabled={saving}
                          aria-label="Cancelar edição"
                        >
                          <XIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void saveEdit(member.user.id)}
                          disabled={saving}
                          aria-label={`Salvar acesso de ${member.user.userId}`}
                        >
                          <CheckIcon />
                        </Button>
                      </>
                    ) : canManage && isConfirmingRemoval ? (
                      <>
                        <span className="text-xs text-muted-foreground">
                          Remover?
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmingUserId(null)}
                          disabled={saving}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void removeMember(member.user.id)}
                          disabled={saving}
                        >
                          Confirmar
                        </Button>
                      </>
                    ) : canManage ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => beginEdit(member)}
                          aria-label={`Editar acesso de ${member.user.userId}`}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmingUserId(member.user.id)}
                          aria-label={`Remover ${member.user.userId} da área de rede`}
                        >
                          <Trash2Icon />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-4 py-5 text-sm text-muted-foreground">
            Nenhuma pessoa com acesso individual foi vinculada a esta área de
            rede.
          </p>
        )}
      </div>
    </section>
  )
}
