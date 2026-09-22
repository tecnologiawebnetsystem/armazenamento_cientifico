import Link from "next/link"
import { ArrowRightIcon, BellIcon, DatabaseIcon, PaletteIcon, ShieldCheckIcon, UserRoundIcon } from "lucide-react"
import { ConfigurationPanel } from "@/components/configuration/configuration-panel"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const settingAreas = [
  { title: "Acesso e segurança", description: "Perfis, permissões e regras de navegação.", icon: ShieldCheckIcon, status: "Protegido" },
  { title: "Perfil e preferências", description: "Dados do usuário e preferências da plataforma.", icon: UserRoundIcon, status: "Disponível" },
  { title: "Aparência", description: "Tema, densidade e preferências visuais.", icon: PaletteIcon, status: "Disponível" },
  { title: "Notificações", description: "Defina como receber atualizações importantes.", icon: BellIcon, status: "Disponível" },
  { title: "Integrações e dados", description: "Conexões, armazenamento e origem dos dados.", icon: DatabaseIcon, status: "Monitorado" },
]

export default function ConfiguracoesPage() {
  return (
    <main className="flex flex-col gap-8 p-4 md:p-8">
      <div>
        <p className="text-sm font-medium text-primary">Administração</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Centralize preferências, segurança e parâmetros operacionais em um único espaço.</p>
      </div>

      <section aria-labelledby="areas-configuracao">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="areas-configuracao" className="text-lg font-semibold">Áreas de configuração</h2>
            <p className="mt-1 text-sm text-muted-foreground">Acesse rapidamente os principais controles da plataforma.</p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex">Ambiente corporativo</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {settingAreas.map(({ title, description, icon: Icon, status }) => (
            <Card key={title} className="group transition-colors hover:border-primary/40">
              <CardHeader className="gap-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon /></div>
                  <Badge variant="secondary" className="text-[10px]">{status}</Badge>
                </div>
                <CardTitle className="text-sm">{title}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-2 pt-0">
                <CardDescription className="text-xs leading-5">{description}</CardDescription>
                <ArrowRightIcon aria-hidden className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-medium">Precisa revisar alterações?</p><p className="text-sm text-muted-foreground">Consulte o histórico de atividades para acompanhar mudanças administrativas.</p></div>
          <Link href="/logs" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Ver histórico <ArrowRightIcon aria-hidden /></Link>
        </CardContent>
      </Card>

      <ConfigurationPanel />
    </main>
  )
}
