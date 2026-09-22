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
        <main className="relative min-w-0 flex-1 overflow-hidden bg-background px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8"><div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_80%_0%,color-mix(in_oklch,var(--petrobras-green)_8%,transparent),transparent_52%)]" /><div className="relative mx-auto w-full max-w-[1800px]">{children}</div></main>
        <AppFooter />
      </div>
    </SidebarProvider>
  )
}
