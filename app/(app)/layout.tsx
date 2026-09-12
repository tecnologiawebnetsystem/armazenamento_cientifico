import { redirect } from "next/navigation"
import { getBackendSession } from "@/lib/session"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { AppFooter } from "@/components/layout/app-footer"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getBackendSession()
  if (!user) redirect("/login")

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex min-h-svh w-full flex-col">
        <AppTopbar />
        <main className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--petrobras-green)_8%,transparent),transparent_32%),linear-gradient(135deg,var(--background),color-mix(in_oklch,var(--petrobras-blue)_4%,var(--background)))] p-3 sm:p-4 md:p-6 lg:p-8">{children}</main>
        <AppFooter />
      </div>
    </SidebarProvider>
  )
}
