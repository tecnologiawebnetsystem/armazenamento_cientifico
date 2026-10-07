import { redirect } from "next/navigation"
import { getBackendSession } from "@/lib/session"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { AppFooter } from "@/components/layout/app-footer"
import { RouteAccessGuard } from "@/components/layout/route-access-guard"
import { ActivityTracker } from "@/components/layout/activity-tracker"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getBackendSession()
  if (!user) redirect("/login")

  return (
    <SidebarProvider>
      <ActivityTracker />
      <AppSidebar />
      <div className="flex min-h-svh w-full flex-col">
        <AppTopbar />
        <main className="relative min-w-0 flex-1 overflow-hidden bg-background px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8"><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_82%_0%,color-mix(in_oklch,var(--petrobras-green)_6%,transparent),transparent_54%)]" /><div className="app-content relative mx-auto w-full max-w-[1680px]"><RouteAccessGuard>{children}</RouteAccessGuard></div></main>
        <AppFooter />
      </div>
    </SidebarProvider>
  )
}
