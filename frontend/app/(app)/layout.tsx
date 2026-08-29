import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex min-h-svh w-full flex-col">
        <AppTopbar />
        <main className="min-w-0 flex-1 bg-muted/30 p-3 sm:p-4 md:p-6 lg:p-7">{children}</main>
      </div>
    </SidebarProvider>
  )
}
