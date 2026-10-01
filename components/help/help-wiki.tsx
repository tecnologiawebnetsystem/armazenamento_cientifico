"use client"

import { useMemo, useState } from "react"
import { BookOpenIcon, CheckCircle2Icon, FileDownIcon, FilterIcon, SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { normalizeRole } from "@/hooks/use-permissions"
import { useSession } from "@/hooks/use-session"
import type { Role } from "@/lib/types"

type HelpTopic = {
  id: string
  title: string
  summary: string
  screen: string
  controls: string[]
  steps: string[]
  roles: Role[]
  action?: string
}

const topics: HelpTopic[] = [
  { id: "inicio", title: "Começando no SIGAC", summary: "Use o menu lateral para acessar somente os módulos liberados para seu perfil.", screen: "A tela inicial reúne um resumo do sistema, atalhos para tarefas frequentes e os indicadores mais importantes.", controls: ["Menu lateral: troca de módulo.", "Topbar: Wiki, tema, perfil e sessão.", "Cards de resumo: acesso rápido a uma área."], steps: ["Confira seu nome e perfil no canto superior direito.", "Abra um módulo pelo menu lateral ou por um atalho do dashboard.", "Use a Wiki contextual para entender a tela atual antes de realizar uma ação."], roles: ["admin", "gerente", "patrocinador", "auditor"] },
  { id: "projetos", title: "Projetos", summary: "Pesquise, filtre e consulte projetos sem carregar uma lista enorme de uma vez.", screen: "A tela começa com uma busca e filtros simples. Os resultados aparecem em lista compacta, com paginação e ações por projeto.", controls: ["Buscar: nome, código ou responsável.", "Filtros: status, área e período de atualização.", "Ordenar: mais recentes ou mais antigos.", "Ações: abrir, editar ou excluir quando permitido.", "Criar projeto: disponível apenas para perfis autorizados."], steps: ["Digite uma palavra ou código para começar a pesquisa.", "Aplique um filtro por vez e confira a quantidade encontrada.", "Abra o projeto desejado para consultar seus dados.", "Use Criar, Editar ou Excluir somente se a ação estiver disponível no seu perfil."], roles: ["admin", "gerente", "patrocinador", "auditor"], action: "A pesquisa é progressiva: quanto mais específico o filtro, menor e mais útil fica a lista." },
  { id: "relatorios", title: "Relatórios e exportação", summary: "Escolha o relatório, refine os dados e exporte apenas o resultado necessário.", screen: "O relatório aparece depois da seleção do tipo e dos filtros. A prévia confirma o conteúdo antes da exportação.", controls: ["Tipo de relatório: define quais filtros serão exibidos.", "Filtros: período, área, status ou responsável.", "Tabela de prévia: confira as linhas encontradas.", "Exportar: PDF, CSV ou TXT conforme o relatório."], steps: ["Escolha primeiro o tipo de relatório.", "Preencha somente os filtros necessários, começando pelo período.", "Confira a quantidade e as linhas da prévia.", "Selecione os campos ou colunas necessários.", "Clique no formato desejado para baixar o resultado."], roles: ["admin", "gerente", "patrocinador", "auditor"], action: "Se o resultado estiver muito grande, volte aos filtros em vez de exportar tudo." },
  { id: "logs", title: "Logs e auditoria", summary: "Investigue eventos do sistema com rastreabilidade e segurança.", screen: "A auditoria é uma consulta detalhada: filtros ficam no topo e cada evento mostra data, usuário, ação, módulo e resultado.", controls: ["Período: delimita a investigação.", "Usuário: identifica quem realizou a ação.", "Módulo e ação: localizam o evento.", "Detalhes: mostram a evidência completa.", "Exportar: arquiva a consulta filtrada."], steps: ["Informe um período antes de pesquisar.", "Refine por usuário, ação ou módulo se necessário.", "Abra um evento para ler os detalhes completos.", "Exporte somente a consulta revisada, quando precisar compartilhar ou arquivar."], roles: ["admin", "gerente", "auditor"] },
  { id: "acessos", title: "Mapa de acessos", summary: "Entenda quem pode acessar cada projeto e recurso.", screen: "A tabela é o resultado oficial. Você pode alternar entre a visão por projeto e a visão por usuário.", controls: ["Visão: por projeto ou por usuário.", "Busca: localiza um nome, projeto ou recurso.", "Filtros: área, perfil, nível de acesso e status.", "Exportar: salva somente os resultados filtrados."], steps: ["Escolha uma visão para definir como os dados serão organizados.", "Pesquise um projeto ou usuário, se já souber o que procura.", "Aplique filtros para reduzir a tabela progressivamente.", "Leia a tabela e confira os filtros ativos antes de exportar."], roles: ["admin", "gerente", "auditor"] },
  { id: "configuracoes", title: "Configurações", summary: "Administre tabelas de apoio usando o CRUD de forma simples e segura.", screen: "Escolha uma tabela pelo nome amigável. A área de registros mostra busca, botão Criar e ações de visualizar, editar e excluir.", controls: ["Seletor de tabela: troca a tabela administrada.", "Buscar registros: encontra dados existentes.", "Criar: abre o formulário de novo registro.", "Visualizar: consulta sem alterar.", "Editar e Excluir: alteram a tabela após confirmação."], steps: ["Escolha a tabela e leia sua descrição antes de começar.", "Use a busca para localizar um registro existente.", "Clique em Criar para inserir ou em Editar para atualizar.", "Use Visualizar para apenas ler os dados.", "Confirme antes de Excluir, pois a ação pode afetar outras telas."], roles: ["admin"] },
]

const roleLabels: Record<string, string> = { admin: "Administrador", gerente: "Gerente", patrocinador: "Patrocinador", auditor: "Editor / Auditor", solicitante: "Solicitante" }

const previewByTopic: Record<string, { search: string; filters: string[]; columns: string[] }> = {
  inicio: { search: "Acesso rápido", filters: ["Resumo", "Atalhos"], columns: ["Indicadores", "Pendências", "Últimas atividades"] },
  projetos: { search: "Nome, código ou responsável", filters: ["Status", "Área", "Atualização"], columns: ["Projeto", "Responsável", "Status"] },
  relatorios: { search: "Escolha um relatório", filters: ["Período", "Área", "Status"], columns: ["Prévia", "Registros", "Exportação"] },
  logs: { search: "Usuário, ação ou módulo", filters: ["Período", "Ação", "Módulo"], columns: ["Data", "Usuário", "Evento"] },
  acessos: { search: "Projeto ou usuário", filters: ["Perfil", "Área", "Acesso"], columns: ["Recurso", "Perfil", "Permissão"] },
  configuracoes: { search: "Buscar registro", filters: ["Tabela selecionada", "Status"], columns: ["Registro", "Descrição", "Ações CRUD"] },
}

function ScreenPreview({ topic }: { topic: HelpTopic }) {
  const preview = previewByTopic[topic.id] ?? previewByTopic.inicio

  return (
    <div className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-inner" aria-label={`Prévia ilustrativa da tela ${topic.title}`}>
      <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-petrobras-green" /><span className="text-xs font-semibold text-foreground">SIGAC / {topic.title}</span></div>
        <span className="text-[10px] text-muted-foreground">Prévia ilustrativa</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex min-w-32 flex-1 items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground"><SearchIcon className="size-3.5" /> {preview.search}</div>
        {preview.filters.map((filter) => <div key={filter} className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">{filter}</div>)}
        {topic.id === "relatorios" || topic.id === "acessos" || topic.id === "logs" ? <div className="flex items-center gap-2 rounded-md border border-petrobras-yellow/40 bg-petrobras-yellow/10 px-2 py-1.5 text-[11px] text-petrobras-yellow"><FileDownIcon className="size-3.5" /> Exportar</div> : null}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">{preview.columns.map((label, index) => <div key={label} className={`rounded-md px-2 py-2 text-[10px] ${index === 0 ? "bg-petrobras-green/10 text-petrobras-green" : "bg-muted/35 text-muted-foreground"}`}>{label}</div>)}</div>
      <p className="mt-2 text-[10px] text-muted-foreground">A imagem é uma representação didática; os dados reais aparecem conforme seu perfil e seus filtros.</p>
    </div>
  )
}

export function HelpWiki() {
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("inicio")
  const [query, setQuery] = useState("")
  const role = normalizeRole(user?.role ?? "solicitante") as Role
  const visibleTopics = useMemo(() => topics.filter((topic) => topic.roles.includes(role)).filter((topic) => `${topic.title} ${topic.summary} ${topic.controls.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query, role])
  const selected = visibleTopics.find((topic) => topic.id === selectedId) ?? visibleTopics[0]

  if (!user || visibleTopics.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir Wiki de ajuda" title="Wiki de ajuda" />}><BookOpenIcon data-icon="inline-start" /></DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] lg:w-[calc(100vw-3rem)] lg:max-w-[calc(100vw-3rem)]">
        <DialogHeader className="border-b bg-muted/30 p-5 pr-12"><div className="flex items-start justify-between gap-3"><div><DialogTitle className="flex items-center gap-2 text-lg"><BookOpenIcon className="text-petrobras-green" /> Wiki de ajuda</DialogTitle><DialogDescription className="mt-2">Guias ilustrados disponíveis para o perfil {roleLabels[role] ?? role}.</DialogDescription></div><Badge variant="outline" className="border-petrobras-yellow/50 text-petrobras-yellow">Ajuda contextual</Badge></div></DialogHeader>
        <div className="grid max-h-[75vh] min-h-[500px] overflow-auto md:grid-cols-[245px_1fr]">
          <aside className="border-b bg-muted/10 p-3 md:border-r md:border-b-0"><div className="relative mb-3"><SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na Wiki" className="pl-8" aria-label="Buscar na Wiki" /></div><nav aria-label="Tópicos da Wiki" className="flex max-h-64 flex-col gap-1 overflow-auto md:max-h-[440px]">{visibleTopics.map((topic) => <button key={topic.id} type="button" onClick={() => setSelectedId(topic.id)} className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${selected?.id === topic.id ? "bg-petrobras-green/15 font-semibold text-petrobras-green" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{topic.title}</button>)}</nav></aside>
          <section className="flex flex-col gap-5 p-5" aria-live="polite">{selected ? <><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-petrobras-yellow">Guia da tela</p><h3 className="text-xl font-semibold text-foreground">{selected.title}</h3><p className="mt-2 leading-6 text-muted-foreground">{selected.summary}</p></div><ScreenPreview topic={selected} /><div><h4 className="mb-2 text-sm font-semibold text-foreground">O que você está vendo</h4><p className="leading-6 text-muted-foreground">{selected.screen}</p></div><div><h4 className="mb-2 text-sm font-semibold text-foreground">Botões e campos</h4><ul className="flex flex-col gap-2">{selected.controls.map((control) => <li key={control} className="rounded-lg border border-border/70 bg-card px-3 py-2 text-sm leading-6 text-foreground">{control}</li>)}</ul></div><div><h4 className="mb-2 text-sm font-semibold text-foreground">Passo a passo</h4><ol className="flex flex-col gap-3">{selected.steps.map((step, index) => <li key={step} className="flex gap-3 rounded-xl border border-border/70 bg-card p-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-petrobras-green/15 text-xs font-bold text-petrobras-green">{index + 1}</span><span className="leading-6 text-foreground">{step}</span></li>)}</ol></div>{selected.action ? <div className="rounded-lg border border-petrobras-yellow/30 bg-petrobras-yellow/10 px-3 py-2 text-sm leading-6 text-foreground"><strong>Dica:</strong> {selected.action}</div> : null}<div className="mt-auto flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground"><CheckCircle2Icon className="size-4 text-petrobras-green" /> O conteúdo é filtrado automaticamente pelas permissões do seu perfil.</div></> : <p className="text-muted-foreground">Nenhum tópico encontrado.</p>}</section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default HelpWiki
