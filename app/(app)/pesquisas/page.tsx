'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { ChevronRight, Clock3, Folder, FolderOpen, Search, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PetrobrasLoading } from '@/components/petrobras-loading'
import { PageHeader, PageLayout } from '@/components/shared/page-layout'
import { getFolders, getProjectAccessMap, getProjects } from '@/lib/api-client'
import type { FileNode, Project, ProjectAccessMapResponse } from '@/lib/types'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function formatDate(value?: string | null) {
  if (!value) return 'Não informado'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Não informado' : dateFormat.format(date)
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function accessLabel(value: string) {
  return ({ leitura: 'Leitura', escrita: 'Escrita', editor: 'Edição', gerente: 'Gestão', admin: 'Administrador' }[value.toLowerCase()] ?? value)
}

export default function AccessMapPage() {
  const [search, setSearch] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useSWR('access-map-projects', () => getProjects({ limit: 100 }))
  const projects = useMemo(() => projectsData?.projects ?? [], [projectsData?.projects])
  const filteredProjects = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return projects.filter((project) => !term || `${project.nome} ${project.codigo} ${project.areaResponsavel}`.toLocaleLowerCase('pt-BR').includes(term))
  }, [projects, search])
  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const { data: accessMap, isLoading: accessLoading, error: accessError, mutate: retryAccess } = useSWR<ProjectAccessMapResponse>(selectedProjectId ? ['project-access-map-page', selectedProjectId] : null, () => getProjectAccessMap(selectedProjectId))
  const { data: foldersData, isLoading: foldersLoading } = useSWR(selectedProjectId ? ['access-map-folders', selectedProjectId] : null, () => getFolders(selectedProjectId))
  const folders = (foldersData?.folders ?? []).filter((item: FileNode) => item.tipo === 'pasta')

  const selectProject = (project: Project) => setSelectedProjectId(project.id)

  return <PageLayout>
    <PageHeader eyebrow="Governança de acesso" title="Mapa de Acessos" description="Pesquise um projeto para consultar suas pastas, grupos e membros autorizados." />
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
      <Card className="sigac-surface h-fit overflow-hidden">
        <CardHeader className="sigac-section-header px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-base"><Search className="size-4 text-primary" />Pesquisar projeto</CardTitle>
          <CardDescription>Selecione um projeto para abrir o mapa de acessos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Pesquisar projeto" className="pl-9" placeholder="Nome, código ou área responsável" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          {projectsLoading ? <PetrobrasLoading label="Carregando projetos..." /> : projectsError ? <p className="text-sm text-destructive">Não foi possível carregar os projetos.</p> : <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">{filteredProjects.map((project) => <button type="button" key={project.id} onClick={() => selectProject(project)} className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${selectedProjectId === project.id ? 'border-primary bg-primary/10' : 'border-border/70 hover:bg-muted/50'}`}><span className="min-w-0"><span className="block truncate text-sm font-semibold">{project.nome}</span><span className="block truncate font-mono text-xs text-muted-foreground">{project.codigo} · {project.areaResponsavel}</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></button>)}{!filteredProjects.length ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum projeto encontrado.</p> : null}</div>}
        </CardContent>
      </Card>

      {!selectedProject ? <Card className="sigac-surface flex min-h-[480px] items-center justify-center"><CardContent className="max-w-md space-y-3 text-center"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-7" /></div><h2 className="text-xl font-semibold">Selecione um projeto</h2><p className="text-sm leading-6 text-muted-foreground">Pesquise e selecione um projeto ao lado para visualizar as pastas, os grupos de identidade e os membros com acesso.</p></CardContent></Card> : <AccessMapDetails project={selectedProject} accessMap={accessMap} accessError={accessError} accessLoading={accessLoading} folders={folders} foldersLoading={foldersLoading} retryAccess={retryAccess} />}
    </div>
  </PageLayout>
}

function AccessMapDetails({ project, accessMap, accessError, accessLoading, folders, foldersLoading, retryAccess }: { project: Project; accessMap?: ProjectAccessMapResponse; accessError?: Error; accessLoading: boolean; folders: FileNode[]; foldersLoading: boolean; retryAccess: () => void }) {
  return <div className="space-y-6">
    <Card className="sigac-surface overflow-hidden"><CardHeader className="sigac-section-header px-5 py-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Projeto selecionado</p><CardTitle className="mt-1 text-2xl">{project.nome}</CardTitle><CardDescription className="mt-1">{project.codigo} · {project.areaResponsavel}</CardDescription></div><Badge variant="secondary">{project.status}</Badge></div></CardHeader><CardContent className="grid gap-3 p-5 sm:grid-cols-3"><div className="rounded-lg border border-border/70 p-3"><p className="text-xs text-muted-foreground">Pastas</p><p className="mt-1 text-2xl font-semibold">{foldersLoading ? '—' : folders.length}</p></div><div className="rounded-lg border border-border/70 p-3"><p className="text-xs text-muted-foreground">Grupos</p><p className="mt-1 text-2xl font-semibold">{accessMap?.groups.length ?? '—'}</p></div><div className="rounded-lg border border-border/70 p-3"><p className="text-xs text-muted-foreground">Membros</p><p className="mt-1 text-2xl font-semibold">{accessMap?.members.length ?? '—'}</p></div></CardContent></Card>
    {accessLoading ? <Card className="sigac-surface"><CardContent className="p-6"><PetrobrasLoading label="Consultando mapa de acessos..." /></CardContent></Card> : accessError ? <Card className="sigac-surface"><CardContent className="flex flex-col items-center gap-3 p-8 text-center"><ShieldCheck className="size-8 text-destructive" /><p className="font-semibold">Não foi possível consultar os acessos</p><p className="text-sm text-muted-foreground">Verifique sua permissão para este projeto e tente novamente.</p><Button variant="outline" onClick={retryAccess}>Tentar novamente</Button></CardContent></Card> : accessMap ? <><Card className="sigac-surface"><CardHeader className="sigac-section-header px-5 py-4"><CardTitle className="text-base">Grupos de acesso</CardTitle><CardDescription>Grupos e níveis consolidados pela API de mapa de acessos.</CardDescription></CardHeader><CardContent className="grid gap-3 p-5 sm:grid-cols-2">{accessMap.groups.map((group) => <div key={`${group.fonte}-${group.nome}`} className="rounded-lg border border-border/70 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{group.nome}</p><p className="mt-1 text-xs text-muted-foreground">Fonte: {group.fonte}</p></div><Badge>{accessLabel(group.nivel)}</Badge></div></div>)}{!accessMap.groups.length ? <p className="text-sm text-muted-foreground">Nenhum grupo configurado.</p> : null}</CardContent></Card><Card className="sigac-surface"><CardHeader className="sigac-section-header px-5 py-4"><CardTitle className="text-base">Membros autorizados</CardTitle><CardDescription>Usuários vinculados ao projeto e seus perfis.</CardDescription></CardHeader><CardContent className="p-0"><div className="divide-y divide-border">{accessMap.members.map((member) => <div key={member.userId} className="flex items-center justify-between gap-3 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(member.user.nome)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.user.nome}</p><p className="truncate text-xs text-muted-foreground">{member.user.email || member.user.id}</p></div></div><Badge variant="outline">{accessLabel(member.papel)}</Badge></div>)}{!accessMap.members.length ? <p className="p-5 text-sm text-muted-foreground">Nenhum membro autorizado.</p> : null}</div></CardContent></Card><Card className="sigac-surface"><CardHeader className="sigac-section-header px-5 py-4"><CardTitle className="flex items-center gap-2 text-base"><FolderOpen className="size-4 text-primary" />Pastas do projeto</CardTitle><CardDescription>Estrutura de pastas disponível dentro do escopo autorizado.</CardDescription></CardHeader><CardContent className="p-0"><div className="divide-y divide-border">{folders.map((folder) => <div key={folder.id} className="flex items-center gap-3 px-5 py-4"><Folder className="size-4 text-primary" /><div><p className="text-sm font-semibold">{folder.nome}</p><p className="text-xs text-muted-foreground">Pasta · atualizada em {formatDate(folder.atualizadoEm)}</p></div></div>)}{!folders.length ? <p className="p-5 text-sm text-muted-foreground">Nenhuma pasta encontrada.</p> : null}</div></CardContent></Card><p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5" />Fonte: {accessMap.source} · Consultado em {formatDate(accessMap.consultedAt)}</p></> : null}
  </div>
}
