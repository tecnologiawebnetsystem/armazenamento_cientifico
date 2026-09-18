import { KeyRoundIcon, MailIcon, ShieldCheckIcon, UserRoundIcon } from "lucide-react"
import { PageHeader, PageLayout, PageSection } from "@/components/shared/page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getBackendSession } from "@/lib/session"

export default async function ProfilePage() {
  const user = await getBackendSession()
  if (!user) return null

  return (
    <PageLayout>
      <PageHeader eyebrow="Identidade corporativa" title="Meu perfil" description="Informações autenticadas pelo CAV4 e permissões administradas pelo SIGAC." />
      <PageSection label="Dados do usuário">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserRoundIcon className="size-5 text-primary" /> Identificação</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div><p className="text-muted-foreground">Nome</p><p className="font-medium">{user.nome || "Não informado"}</p></div>
              <div className="flex items-start gap-3"><MailIcon className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-muted-foreground">E-mail corporativo</p><p className="font-medium break-all">{user.email}</p></div></div>
              <div><p className="text-muted-foreground">Cargo / área</p><p className="font-medium">{[user.cargo, user.area].filter(Boolean).join(" · ") || "Não informado"}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheckIcon className="size-5 text-primary" /> Acesso SIGAC</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div><p className="text-muted-foreground">Perfil local</p><p className="font-medium">{user.perfilNome || user.role || "Não configurado"}</p></div>
              <div><p className="text-muted-foreground">Permissões ativas</p><p className="font-medium">{user.permissions?.length ?? 0}</p></div>
              <div><p className="text-muted-foreground">Origem da autorização</p><p className="font-medium">Banco de dados SIGAC</p></div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><KeyRoundIcon className="size-5 text-primary" /> Chave de identidade CAV4</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-2 text-sm text-muted-foreground">Identificador retornado pelo CAV4 para esta sessão. O token de acesso nunca é exibido.</p>
              <code className="block overflow-x-auto rounded-lg border bg-muted/50 p-3 text-sm">{user.chaveCav4 || "Não disponível nesta sessão"}</code>
            </CardContent>
          </Card>
        </div>
      </PageSection>
    </PageLayout>
  )
}
