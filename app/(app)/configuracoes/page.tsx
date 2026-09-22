import { ConfigurationPanel } from "@/components/configuration/configuration-panel"

export default function ConfiguracoesPage() {
  return <main className="flex flex-col gap-8 p-4 md:p-8"><div><p className="text-sm font-medium text-primary">Administração</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Configurações</h1><p className="mt-2 max-w-2xl text-muted-foreground">Parametrização central da plataforma, com cadastros relacionados organizados por domínio.</p></div><ConfigurationPanel /></main>
}
