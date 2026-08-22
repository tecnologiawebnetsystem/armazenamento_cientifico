"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { FolderIcon, MailIcon, SaveIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useProjects } from "@/hooks/use-projects"
import { roleLabel } from "@/hooks/use-permissions"
import { ProjectStatusBadge } from "@/components/projects/project-status-badge"
import type { SessionUser } from "@/lib/types"

function initials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function ProfileView({ user }: { user: SessionUser }) {
  const { projects, isLoading } = useProjects()
  const [email, setEmail] = useState(user.email)
  const [cargo, setCargo] = useState(user.cargo)
  const [isSaving, setIsSaving] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    // Simulação local: não há endpoint de atualização de perfil próprio no
    // backend mock; os dados de contato exibidos aqui refletem apenas a sessão.
    setTimeout(() => {
      setIsSaving(false)
      toast.success("Dados de contato atualizados (simulação local).")
    }, 500)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="size-16">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.nome} /> : null}
            <AvatarFallback className="text-lg">{initials(user.nome)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl">{user.nome}</CardTitle>
            <CardDescription>{user.cargo}</CardDescription>
            <Badge variant="outline" className="mt-1 w-fit border-primary/30 bg-primary/10 text-primary">
              {roleLabel(user.role)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Área</dt>
              <dd className="text-sm font-medium text-foreground">{user.area}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Membro desde</dt>
              <dd className="text-sm font-medium text-foreground">
                {new Date(user.criadoEm).toLocaleDateString("pt-BR")}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Dados de contato</CardTitle>
            <CardDescription>Atualize seu email corporativo e cargo exibidos na plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email corporativo</FieldLabel>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <FieldDescription>Usado para autenticação e notificações da plataforma.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="cargo">Cargo</FieldLabel>
                <Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} required />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={isSaving}>
              <SaveIcon data-icon="inline-start" />
              Salvar alterações
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Meus projetos</CardTitle>
          <CardDescription>Projetos científicos em que você participa atualmente.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MailIcon />
                </EmptyMedia>
                <EmptyTitle>Nenhum projeto vinculado</EmptyTitle>
                <EmptyDescription>
                  Você ainda não participa de nenhum projeto. Solicite acesso a um projeto científico.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projetos/${project.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
                      <FolderIcon className="size-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{project.nome}</span>
                      <span className="font-mono text-xs text-muted-foreground">{project.id}</span>
                    </div>
                  </div>
                  <ProjectStatusBadge status={project.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
