"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FolderOpen, Info, Users } from "lucide-react"
import { ProjectInfoTab } from "@/components/projects/project-info-tab"
import { ProjectMembersTab } from "@/components/projects/project-members-tab"
import { ProjectFileExplorer } from "@/components/projects/project-file-explorer"
import { useProject } from "@/hooks/use-project"
import { useSearchParams } from "next/navigation"
import type { Project } from "@/lib/types"

export function ProjectDetailTabs({
  projectId,
  initialProject,
  canEdit,
  canDelete,
  canManageMembers,
  canWriteFiles,
}: {
  projectId: string
  initialProject: Project
  canEdit: boolean
  canDelete: boolean
  canManageMembers: boolean
  canWriteFiles: boolean
}) {
  const searchParams = useSearchParams()
  const { project, refresh } = useProject(projectId)
  const current = project ?? initialProject
  const initialTab = searchParams.get("aba") === "informacoes" ? "informacoes" : "arquivos"

  return (
    <Tabs key={initialTab} defaultValue={initialTab}>
      <TabsList aria-label="Seções do projeto" className="grid h-auto w-full grid-cols-1 gap-1 rounded-2xl border border-petrobras-green/20 bg-petrobras-green/5 p-1.5 shadow-sm sm:grid-cols-3">
        <TabsTrigger className="group flex min-h-14 items-center justify-start gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-all hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-petrobras-green/50 data-[state=active]:bg-petrobras-green data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:justify-center sm:text-center" value="arquivos">
          <FolderOpen aria-hidden="true" className="size-5 shrink-0 transition-transform group-data-[state=active]:scale-110" />
          <span className="flex flex-col gap-0.5"><span>Arquivos</span><span className="text-xs font-normal opacity-70">Documentos do projeto</span></span>
        </TabsTrigger>
        <TabsTrigger className="group flex min-h-14 items-center justify-start gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-all hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-petrobras-green/50 data-[state=active]:bg-petrobras-green data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:justify-center sm:text-center" value="membros">
          <Users aria-hidden="true" className="size-5 shrink-0 transition-transform group-data-[state=active]:scale-110" />
          <span className="flex flex-col gap-0.5"><span>Membros e permissões</span><span className="text-xs font-normal opacity-70">Acessos e responsabilidades</span></span>
        </TabsTrigger>
        <TabsTrigger className="group flex min-h-14 items-center justify-start gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-all hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-petrobras-green/50 data-[state=active]:bg-petrobras-green data-[state=active]:text-primary-foreground data-[state=active]:shadow-md sm:justify-center sm:text-center" value="informacoes">
          <Info aria-hidden="true" className="size-5 shrink-0 transition-transform group-data-[state=active]:scale-110" />
          <span className="flex flex-col gap-0.5"><span>Informações</span><span className="text-xs font-normal opacity-70">Dados e configurações</span></span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="arquivos" className="mt-4">
        <ProjectFileExplorer projectId={projectId} canWrite={canWriteFiles} />
      </TabsContent>
      <TabsContent value="membros" className="mt-4">
        <ProjectMembersTab projectId={projectId} canManage={canManageMembers} />
      </TabsContent>
      <TabsContent value="informacoes" className="mt-4">
        <ProjectInfoTab project={current} canEdit={canEdit} canDelete={canDelete} onUpdated={() => refresh()} />
      </TabsContent>
    </Tabs>
  )
}
