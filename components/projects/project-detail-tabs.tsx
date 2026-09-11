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
      <TabsList aria-label="Seções do projeto" className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-petrobras-green/20 bg-petrobras-green/5 p-1">
        <TabsTrigger className="group flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-petrobras-green/50 data-[state=active]:bg-petrobras-green data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm sm:text-sm" value="arquivos"><FolderOpen aria-hidden="true" className="size-4 shrink-0" /><span>Arquivos</span></TabsTrigger>
        <TabsTrigger className="group flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-petrobras-green/50 data-[state=active]:bg-petrobras-green data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm sm:text-sm" value="membros"><Users aria-hidden="true" className="size-4 shrink-0" /><span className="truncate">Membros e permissões</span></TabsTrigger>
        <TabsTrigger className="group flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-petrobras-green/50 data-[state=active]:bg-petrobras-green data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm sm:text-sm" value="informacoes"><Info aria-hidden="true" className="size-4 shrink-0" /><span>Informações</span></TabsTrigger>
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
