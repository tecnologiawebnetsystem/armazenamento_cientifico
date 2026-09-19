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
              <div><p className="text-muted-foreground">Último acesso</p><p className="font-medium">{user.ultimoLogin ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(user.ultimoLogin)) : "Não registrado"}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheckIcon className="size-5 text-primary" /> Acesso SIGAC</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div><p className="text-muted-foreground">Perfil local</p><p className="font-medium">{user.perfilNome || user.role || "Não configurado"}</p></div>
              <div><p className="text-muted-foreground">Permissões ativas</p><p className="font-medium">{user.permissions?.length ?? 0}</p></div>
              <div><p className="text-muted-foreground">Identificador do usuário</p><p className="break-all font-medium">{user.id}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><KeyRoundIcon className="size-5 text-primary" /> Identidade da sessão</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div><p className="text-muted-foreground">Cadastro criado em</p><p className="font-medium">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(user.criadoEm))}</p></div>
              <div><p className="text-muted-foreground">Chave CAV4</p><p className="break-all font-medium">{user.chaveCav4 || "Não informada"}</p></div>
              <div><p className="text-muted-foreground">Informações retornadas pelo CAV4</p><p className="font-medium">{user.roles?.length ? user.roles.join(" · ") : "Identidade confirmada pelo login corporativo"}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheckIcon className="size-5 text-primary" /> Permissões efetivas</CardTitle></CardHeader>
            <CardContent>
              {user.permissions?.length ? <ul className="grid gap-2 text-sm sm:grid-cols-2">{user.permissions.map((permission) => <li key={permission} className="rounded-lg bg-muted/50 px-3 py-2 font-medium">{permission}</li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhuma permissão registrada para esta sessão.</p>}
            </CardContent>
          </Card>
        </div>
      </PageSection>
    </PageLayout>
  )
}
