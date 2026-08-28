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
      <TabsList aria-label="Seções do projeto" className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border bg-muted/50 p-1.5 shadow-sm">
        <TabsTrigger className="rounded-lg border border-transparent px-3 py-3 text-xs font-medium transition-all data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm" value="arquivos">Arquivos</TabsTrigger>
        <TabsTrigger className="rounded-lg border border-transparent px-3 py-3 text-xs font-medium transition-all data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm" value="membros">Membros e Permissões</TabsTrigger>
        <TabsTrigger className="rounded-lg border border-transparent px-3 py-3 text-xs font-medium transition-all data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm" value="informacoes">Informações</TabsTrigger>
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
