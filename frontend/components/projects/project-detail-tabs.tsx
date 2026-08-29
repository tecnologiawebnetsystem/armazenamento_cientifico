"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
      <TabsList aria-label="Seções do projeto" className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-petrobras-green/20 bg-petrobras-green/5 p-1.5 shadow-sm sm:flex-nowrap">
        <TabsTrigger className="min-w-28 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-petrobras-green data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm" value="arquivos">Arquivos</TabsTrigger>
        <TabsTrigger className="min-w-40 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-petrobras-green data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm" value="membros">Membros e permissões</TabsTrigger>
        <TabsTrigger className="min-w-32 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-petrobras-green data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm" value="informacoes">Informações</TabsTrigger>
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
