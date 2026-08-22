"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUsers } from "@/hooks/use-users"
import { createProject, ApiError } from "@/lib/api-client"
import type { SessionUser } from "@/lib/types"

function ChipInput({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (value: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("")
  function add() {
    const item = draft.trim()
    if (item && !value.includes(item)) onChange([...value, item])
    setDraft("")
  }
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }} />
        <Button type="button" variant="outline" size="icon" onClick={add} aria-label={`Adicionar ${label}`}><PlusIcon data-icon="inline-start" /></Button>
      </div>
      {value.length > 0 && <div className="flex flex-wrap gap-2 pt-1">{value.map((item) => <Badge key={item} variant="secondary" className="gap-1">{item}<button type="button" onClick={() => onChange(value.filter((v) => v !== item))} aria-label={`Remover ${item}`}><XIcon data-icon="inline-start" /></button></Badge>)}</div>}
    </Field>
  )
}

export function NewProjectForm({ currentUser }: { currentUser: SessionUser }) {
  const router = useRouter()
  const { users } = useUsers()
  const [nome, setNome] = useState("")
  const [codigo, setCodigo] = useState("")
  const [criadoEm, setCriadoEm] = useState(new Date().toISOString().slice(0, 10))
  const [areaResponsavel, setAreaResponsavel] = useState("")
  const [gestoresIds, setGestoresIds] = useState<string[]>(currentUser.role === "gerente" ? [currentUser.id] : [])
  const [grupoAdEscrita, setGrupoAdEscrita] = useState<string[]>([])
  const [grupoAdLeitura, setGrupoAdLeitura] = useState<string[]>([])
  const [roleIdentidadeEscrita, setRoleIdentidadeEscrita] = useState<string[]>([])
  const [roleIdentidadeLeitura, setRoleIdentidadeLeitura] = useState<string[]>([])
  const [numeroTarefaSnow, setNumeroTarefaSnow] = useState("")
  const [pastaMae, setPastaMae] = useState("")
  const [descricao, setDescricao] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const gestores = users.filter((u) => u.role === "gerente" || u.role === "admin" || u.role === "patrocinador")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !codigo.trim() || !criadoEm || !areaResponsavel.trim() || gestoresIds.length === 0 || !pastaMae.trim()) {
      toast.error("Preencha os campos obrigatórios, incluindo ao menos um gestor.")
      return
    }
    setIsSubmitting(true)
    try {
      const { project } = await createProject({ nome: nome.trim(), codigo: codigo.trim(), criadoEm, areaResponsavel: areaResponsavel.trim(), gestoresIds, grupoAdEscrita: grupoAdEscrita.join(", "), grupoAdLeitura: grupoAdLeitura.join(", "), roleIdentidadeEscrita: roleIdentidadeEscrita.join(", "), roleIdentidadeLeitura: roleIdentidadeLeitura.join(", "), numeroTarefaSnow: numeroTarefaSnow.trim(), pastaMae: pastaMae.trim(), descricao: descricao.trim(), participantesIds: gestoresIds }) as { project: import("@/lib/types").Project }
      toast.success("Projeto criado com sucesso.")
      router.push(`/projetos/${project.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível criar o projeto.")
    } finally { setIsSubmitting(false) }
  }

  return <form onSubmit={handleSubmit}><Card>
    <CardHeader><CardTitle>Informações do projeto</CardTitle><CardDescription>Cadastre os dados de governança, acesso e armazenamento do projeto.</CardDescription></CardHeader>
    <CardContent><FieldGroup>
      <Field><FieldLabel htmlFor="nome">Nome do projeto</FieldLabel><Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Caracterização de Reservatórios" /></Field>
      <div className="grid gap-6 md:grid-cols-2"><Field><FieldLabel htmlFor="codigo">Código ou identificador único</FieldLabel><Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: CENPES-EP-2026-0001" /></Field><Field><FieldLabel htmlFor="criadoEm">Data de criação</FieldLabel><Input id="criadoEm" type="date" value={criadoEm} onChange={(e) => setCriadoEm(e.target.value)} /></Field></div>
      <Field><FieldLabel htmlFor="area">Área (gerência) responsável</FieldLabel><Input id="area" value={areaResponsavel} onChange={(e) => setAreaResponsavel(e.target.value)} placeholder="Ex.: CENPES - Geociências" /></Field>
      <Field><FieldLabel htmlFor="gestores">Gestor(es) do projeto</FieldLabel><Select onValueChange={(id: string | null) => { if (id && !gestoresIds.includes(id)) setGestoresIds([...gestoresIds, id]) }}><SelectTrigger id="gestores"><SelectValue placeholder="Adicionar gestor" /></SelectTrigger><SelectContent><SelectGroup>{gestores.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome} · {u.area}</SelectItem>)}</SelectGroup></SelectContent></Select><div className="flex flex-wrap gap-2 pt-1">{gestoresIds.map((id) => { const u = users.find((item) => item.id === id); return u ? <Badge key={id} variant="secondary" className="gap-1">{u.nome}<button type="button" onClick={() => setGestoresIds(gestoresIds.filter((v) => v !== id))} aria-label={`Remover ${u.nome}`}><XIcon data-icon="inline-start" /></button></Badge> : null })}</div><FieldDescription>É possível cadastrar mais de um gestor.</FieldDescription></Field>
      <div className="grid gap-6 md:grid-cols-2"><ChipInput label="Grupos de Azure AD — escrita" value={grupoAdEscrita} onChange={setGrupoAdEscrita} placeholder="Nome do grupo de escrita" /><ChipInput label="Grupos de Azure AD — leitura" value={grupoAdLeitura} onChange={setGrupoAdLeitura} placeholder="Nome do grupo de leitura" /><ChipInput label="Roles do Identidade — escrita" value={roleIdentidadeEscrita} onChange={setRoleIdentidadeEscrita} placeholder="Nome da role de escrita" /><ChipInput label="Roles do Identidade — leitura" value={roleIdentidadeLeitura} onChange={setRoleIdentidadeLeitura} placeholder="Nome da role de leitura" /></div>
      <div className="grid gap-6 md:grid-cols-2"><Field><FieldLabel htmlFor="snow">Número da tarefa do Snow</FieldLabel><Input id="snow" value={numeroTarefaSnow} onChange={(e) => setNumeroTarefaSnow(e.target.value)} placeholder="Ex.: TASK0041827" /></Field><Field><FieldLabel htmlFor="pasta">Nome da pasta mãe do projeto</FieldLabel><Input id="pasta" value={pastaMae} onChange={(e) => setPastaMae(e.target.value)} placeholder="Ex.: presal-caracterizacao" /></Field></div>
      <Field><FieldLabel htmlFor="descricao">Descrição</FieldLabel><Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o objetivo e o escopo do projeto." rows={4} /></Field>
    </FieldGroup></CardContent>
    <CardFooter className="justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.push("/projetos")} disabled={isSubmitting}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2Icon data-icon="inline-start" className="animate-spin" />}Criar projeto</Button></CardFooter>
  </Card></form>
}
