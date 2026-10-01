"use client"

import { useMemo, useState } from "react"
import { BookOpenIcon, CheckCircle2Icon, SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useSession } from "@/hooks/use-session"
import type { Role } from "@/lib/types"

type HelpTopic = {
  id: string
  title: string
  summary: string
  steps: string[]
  roles: Role[]
}

const topics: HelpTopic[] = [
  { id: "inicio", title: "Começando no SIGAC", summary: "Entenda a navegação, seu perfil e as ações disponíveis.", steps: ["Use o menu lateral para abrir apenas os módulos liberados para seu perfil.", "Confira seu nome e perfil no menu do usuário, no canto superior direito.", "Use a Wiki sempre que precisar entender uma tela ou procedimento."], roles: ["admin", "gerente", "patrocinador", "auditor"] },
  { id: "projetos", title: "Projetos", summary: "Pesquise, consulte e cadastre projetos conforme sua permissão.", steps: ["Digite nome, código ou responsável na busca para localizar um projeto.", "Use os filtros de status, área e período para reduzir a lista progressivamente.", "Abra um resultado para consultar detalhes; administradores e gestores verão as ações permitidas.", "Use Criar projeto somente quando o botão estiver disponível para seu perfil."], roles: ["admin", "gerente", "patrocinador", "auditor"] },
  { id: "relatorios", title: "Relatórios e exportação", summary: "Filtre primeiro, confira os resultados e exporte somente o necessário.", steps: ["Escolha o tipo de relatório antes de preencher filtros avançados.", "Aplique os filtros aos poucos e acompanhe a quantidade de resultados.", "Revise a prévia e selecione os campos necessários.", "Escolha o formato de exportação disponível, como PDF, CSV ou TXT."], roles: ["admin", "gerente", "patrocinador", "auditor"] },
  { id: "logs", title: "Logs e auditoria", summary: "Investigue eventos e acompanhe a trilha de alterações.", steps: ["Informe um período para limitar a consulta.", "Refine por usuário, ação, módulo ou resultado.", "Abra um evento para consultar os detalhes completos da operação.", "Exporte a consulta quando precisar compartilhar ou arquivar a evidência."], roles: ["admin", "gerente", "auditor"] },
  { id: "acessos", title: "Mapa de acessos", summary: "Visualize quem pode acessar cada projeto e recurso.", steps: ["Escolha a visão por projeto ou por usuário.", "Filtre por área, perfil, nível de acesso ou status.", "Leia a tabela de resultados como a fonte oficial da consulta.", "Exporte somente depois de conferir os filtros ativos."], roles: ["admin", "gerente", "auditor"] },
  { id: "configuracoes", title: "Configurações", summary: "Administre tabelas de apoio com operações CRUD claras.", steps: ["Escolha uma tabela pelo nome amigável e leia sua descrição.", "Use Criar para inserir um registro e a busca para localizar dados existentes.", "Abra um registro para visualizar ou editar seus campos.", "Use Excluir apenas após confirmar que o registro não é mais necessário."], roles: ["admin"] },
]

const roleLabels: Record<string, string> = { admin: "Administrador", gerente: "Gerente", patrocinador: "Patrocinador", auditor: "Editor / Auditor", solicitante: "Solicitante" }

export function HelpWiki() {
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("inicio")
  const [query, setQuery] = useState("")
  const role = (user?.role ?? "solicitante") as Role
  const visibleTopics = useMemo(() => topics.filter((topic) => topic.roles.includes(role)).filter((topic) => `${topic.title} ${topic.summary}`.toLowerCase().includes(query.toLowerCase())), [query, role])
  const selected = visibleTopics.find((topic) => topic.id === selectedId) ?? visibleTopics[0]

  if (!user || visibleTopics.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir Wiki de ajuda" title="Wiki de ajuda" />}>
        <BookOpenIcon data-icon="inline-start" />
      </DialogTrigger>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 p-5 pr-12">
          <div className="flex items-start justify-between gap-3">
            <div><DialogTitle className="flex items-center gap-2 text-lg"><BookOpenIcon className="text-petrobras-green" /> Wiki de ajuda</DialogTitle><DialogDescription className="mt-2">Orientações disponíveis para o perfil {roleLabels[role] ?? role}.</DialogDescription></div>
            <Badge variant="outline" className="border-petrobras-yellow/50 text-petrobras-yellow">Ajuda contextual</Badge>
          </div>
        </DialogHeader>
        <div className="grid min-h-[430px] md:grid-cols-[245px_1fr]">
          <aside className="border-b bg-muted/10 p-3 md:border-r md:border-b-0">
            <div className="relative mb-3"><SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na Wiki" className="pl-8" aria-label="Buscar na Wiki" /></div>
            <nav aria-label="Tópicos da Wiki" className="flex max-h-64 flex-col gap-1 overflow-auto md:max-h-[350px]">
              {visibleTopics.map((topic) => <button key={topic.id} type="button" onClick={() => setSelectedId(topic.id)} className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${selected?.id === topic.id ? "bg-petrobras-green/15 font-semibold text-petrobras-green" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{topic.title}</button>)}
            </nav>
          </aside>
          <section className="flex flex-col gap-5 p-5" aria-live="polite">
            {selected ? <><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-petrobras-yellow">Como fazer</p><h3 className="text-xl font-semibold text-foreground">{selected.title}</h3><p className="mt-2 leading-6 text-muted-foreground">{selected.summary}</p></div><ol className="flex flex-col gap-3">{selected.steps.map((step, index) => <li key={step} className="flex gap-3 rounded-xl border border-border/70 bg-card p-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-petrobras-green/15 text-xs font-bold text-petrobras-green">{index + 1}</span><span className="leading-6 text-foreground">{step}</span></li>)}</ol><div className="mt-auto flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground"><CheckCircle2Icon className="size-4 text-petrobras-green" /> O conteúdo é filtrado automaticamente pelas permissões do seu perfil.</div></> : <p className="text-muted-foreground">Nenhum tópico encontrado.</p>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default HelpWiki
