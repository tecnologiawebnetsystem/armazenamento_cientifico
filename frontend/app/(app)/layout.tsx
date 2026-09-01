import { redirect } from "next/navigation"
import { getBackendSession } from "@/lib/session"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getBackendSession()
  if (!user) redirect("/login")

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex min-h-svh w-full flex-col">
        <AppTopbar />
        <main className="min-w-0 flex-1 bg-muted/40 p-3 sm:p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </SidebarProvider>
  )
}
