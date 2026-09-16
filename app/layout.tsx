import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "SIGAC | Petrobras",
  description:
    "SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico da Petrobras, com organização, compartilhamento e controle de acesso por perfis e permissões.",
  icons: {
    icon: "/images/petrobras-logo.png",
    shortcut: "/images/petrobras-logo.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d4d2b",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className="antialiased bg-background font-sans"
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
