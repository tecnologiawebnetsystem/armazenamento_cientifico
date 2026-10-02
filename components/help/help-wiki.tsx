"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { BookOpenIcon, CheckCircle2Icon, FileDownIcon, SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { roleLabel } from "@/hooks/use-permissions"
import { usePlatformContext } from "@/hooks/use-platform-context"
import { useSession } from "@/hooks/use-session"

type HelpTopic = {
  id: string
  route: string
  title: string
  summary: string
  screen: string
  businessContext: string
  screenshot?: { src: string; alt: string; caption: string }
  controls: string[]
  steps: string[]
  action?: string
}

const topics: HelpTopic[] = [
  { id: "inicio", route: "/dashboard", title: "Começando no SIGAC", summary: "Comece pelo seu contexto de trabalho: o SIGAC exibe somente os módulos e recursos autorizados para o seu perfil.", screen: "O dashboard funciona como uma central de decisão. Ele orienta a entrada no sistema, apresenta os atalhos mais usados e ajuda a identificar rapidamente o que precisa de atenção.", businessContext: "O SIGAC organiza o acesso aos dados científicos por perfil, projeto e responsabilidade. Antes de executar uma tarefa, confirme se você está no módulo correto e se o perfil exibido corresponde à sua atuação.", screenshot: { src: "/help/sigac-login.png", alt: "Tela de acesso corporativo ao SIGAC", caption: "A entrada do SIGAC informa o propósito da plataforma e direciona para a autenticação corporativa." }, controls: ["Menu lateral: navega entre os módulos liberados.", "Topbar: abre a Wiki, consulta o perfil e encerra a sessão.", "Indicadores e atalhos: levam às tarefas mais relevantes para sua rotina."], steps: ["Confirme seu perfil após o login corporativo.", "Leia os indicadores antes de iniciar uma operação.", "Entre no módulo correspondente à sua responsabilidade.", "Use a Wiki contextual para entender o objetivo da tela antes de alterar dados."] },
  { id: "projetos", route: "/projetos", title: "Projetos", summary: "Mantenha o portfólio confiável: consulte o projeto certo, valide seu status e trabalhe apenas nos registros sob sua responsabilidade.", screen: "A tela de Projetos transforma o portfólio em uma fila de trabalho pesquisável. Busca, filtros e ordenação reduzem o ruído para que a equipe encontre rapidamente o registro que precisa analisar ou atualizar.", businessContext: "Um projeto é a referência para organizar dados científicos, responsáveis, áreas e permissões. Use o código e o status como critérios de conferência antes de compartilhar informação ou iniciar uma alteração.", controls: ["Busca: localiza por nome, código ou área responsável.", "Status e área: recortam o portfólio conforme o contexto de negócio.", "Ordenação e paginação: facilitam a leitura de listas extensas.", "Abrir: consulta os dados e a composição do projeto.", "Criar, editar e excluir: aparecem somente quando liberados para o seu perfil."], steps: ["Pesquise pelo código quando já souber a identificação do projeto.", "Aplique status e área para separar ativos, encerrados ou sob sua gestão.", "Abra o projeto e valide responsáveis e dados antes de agir.", "Registre alterações somente quando elas refletirem o estado oficial do projeto."], action: "Use filtros combinados para tomar decisões com uma amostra controlada, sem perder a visão do portfólio." },
  { id: "relatorios", route: "/relatorios", title: "Relatórios e exportação", summary: "Transforme os dados autorizados em informação para acompanhamento, prestação de contas e tomada de decisão.", screen: "A tela de Consultas e relatórios apresenta um panorama executivo do portfólio e permite investigar os projetos com filtros progressivos. A prévia torna o resultado auditável antes da exportação.", businessContext: "Relatórios devem responder a uma pergunta de negócio: quais projetos estão ativos, onde estão os responsáveis, qual o status da carteira ou quais dados precisam ser compartilhados. O resultado respeita o escopo autorizado do usuário.", controls: ["Tipo de relatório: define quais filtros serão exibidos.", "Filtros: período, área, status ou responsável.", "Tabela de prévia: confira as linhas encontradas.", "Exportar: PDF, CSV ou TXT conforme o relatório."], steps: ["Escolha primeiro o tipo de relatório.", "Preencha somente os filtros necessários, começando pelo período.", "Confira a quantidade e as linhas da prévia.", "Selecione os campos ou colunas necessários.", "Clique no formato desejado para baixar o resultado."], action: "Se o resultado estiver muito grande, volte aos filtros em vez de exportar tudo." },
  { id: "logs", route: "/logs", title: "Logs e auditoria", summary: "Encontre evidências de uso do sistema e acompanhe quem fez cada alteração, quando e em qual módulo.", screen: "A tela de Logs e auditoria organiza os eventos em uma linha do tempo consultável. Cada registro ajuda a explicar uma mudança, validar uma operação ou apoiar uma investigação.", businessContext: "A trilha de auditoria protege a confiabilidade do acervo: ela permite distinguir uma atualização legítima de um comportamento inesperado e fornece contexto para controles internos, suporte e conformidade.", controls: ["Período: delimita a investigação.", "Usuário: identifica quem realizou a ação.", "Módulo e ação: localizam o evento.", "Detalhes: mostram a evidência completa.", "Exportar: arquiva a consulta filtrada."], steps: ["Informe um período antes de pesquisar.", "Refine por usuário, ação ou módulo se necessário.", "Abra um evento para ler os detalhes completos.", "Exporte somente a consulta revisada, quando precisar compartilhar ou arquivar."] },
  { id: "acessos", route: "/pesquisas", title: "Mapa de acessos", summary: "Valide se cada pessoa tem o nível de acesso adequado ao projeto e ao recurso que precisa utilizar.", screen: "O Mapa de acessos consolida as permissões em uma visão por projeto ou por usuário. Ele apoia revisões periódicas, investigação de divergências e decisões de concessão ou restrição.", businessContext: "O acesso deve acompanhar a responsabilidade real de cada pessoa. Use esta tela para identificar excesso de permissão, ausência de acesso necessário e mudanças que precisam ser justificadas.", controls: ["Visão: por projeto ou por usuário.", "Busca: localiza um nome, projeto ou recurso.", "Filtros: área, perfil, nível de acesso e status.", "Exportar: salva somente os resultados filtrados."], steps: ["Escolha uma visão para definir como os dados serão organizados.", "Pesquise um projeto ou usuário, se já souber o que procura.", "Aplique filtros para reduzir a tabela progressivamente.", "Leia a tabela e confira os filtros ativos antes de exportar."] },
  { id: "configuracoes", route: "/configuracoes", title: "Configurações", summary: "Mantenha os cadastros de referência que sustentam filtros, classificações e regras do SIGAC.", screen: "Configurações concentra os cadastros administrativos em uma experiência única. A descrição de cada tabela ajuda a entender o impacto do registro antes de criar, editar ou excluir.", businessContext: "Cadastros de apoio são dados estruturantes: uma alteração pode mudar a forma como projetos são classificados, filtrados ou exibidos para outras áreas. Faça mudanças com critério e registre a motivação quando o processo exigir.", controls: ["Seletor de tabela: troca a tabela administrada.", "Buscar registros: encontra dados existentes.", "Criar: abre o formulário de novo registro.", "Visualizar: consulta sem alterar.", "Editar e Excluir: alteram a tabela após confirmação."], steps: ["Escolha a tabela e leia sua descrição antes de começar.", "Use a busca para localizar um registro existente.", "Clique em Criar para inserir ou em Editar para atualizar.", "Use Visualizar para apenas ler os dados.", "Confirme antes de Excluir, pois a ação pode afetar outras telas."] },
]

const previewByTopic: Record<string, { search: string; filters: string[]; columns: string[] }> = {
  inicio: { search: "Acesso rápido", filters: ["Resumo", "Atalhos"], columns: ["Indicadores", "Pendências", "Últimas atividades"] },
  projetos: { search: "Nome, código ou responsável", filters: ["Status", "Área", "Atualização"], columns: ["Projeto", "Responsável", "Status"] },
  relatorios: { search: "Escolha um relatório", filters: ["Período", "Área", "Status"], columns: ["Prévia", "Registros", "Exportação"] },
  logs: { search: "Usuário, ação ou módulo", filters: ["Período", "Ação", "Módulo"], columns: ["Data", "Usuário", "Evento"] },
  acessos: { search: "Projeto ou usuário", filters: ["Perfil", "Área", "Acesso"], columns: ["Recurso", "Perfil", "Permissão"] },
  configuracoes: { search: "Buscar registro", filters: ["Tabela selecionada", "Status"], columns: ["Registro", "Descrição", "Ações CRUD"] },
}

const topicAccentClasses: Record<string, { surface: string; dot: string; label: string }> = {
  inicio: { surface: "border-petrobras-teal/40 bg-petrobras-teal/10", dot: "bg-petrobras-teal", label: "text-petrobras-teal" },
  projetos: { surface: "border-petrobras-green/40 bg-petrobras-green/10", dot: "bg-petrobras-green", label: "text-petrobras-green" },
  relatorios: { surface: "border-petrobras-yellow/40 bg-petrobras-yellow/10", dot: "bg-petrobras-yellow", label: "text-petrobras-yellow" },
  logs: { surface: "border-petrobras-blue/40 bg-petrobras-blue/10", dot: "bg-petrobras-blue", label: "text-petrobras-blue" },
  acessos: { surface: "border-petrobras-teal/40 bg-petrobras-teal/10", dot: "bg-petrobras-teal", label: "text-petrobras-teal" },
  configuracoes: { surface: "border-destructive/40 bg-destructive/10", dot: "bg-destructive", label: "text-destructive" },
}

function ScreenPreview({ topic }: { topic: HelpTopic }) {
  const preview = previewByTopic[topic.id] ?? previewByTopic.inicio
  const accent = topicAccentClasses[topic.id] ?? topicAccentClasses.inicio

  return (
    <div className={`rounded-xl border p-3 shadow-inner ${accent.surface}`} aria-label={`Prévia da tela ${topic.title}`}>
      {topic.screenshot ? (
        <figure className="mb-4 overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm">
          <Image src={topic.screenshot.src} alt={topic.screenshot.alt} width={1280} height={695} className="h-auto w-full" />
          <figcaption className="border-t border-border/70 px-3 py-2 text-xs leading-5 text-muted-foreground">{topic.screenshot.caption}</figcaption>
        </figure>
      ) : null}
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Visão da tela</p>
      <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${accent.dot}`} /><span className="text-xs font-semibold text-foreground">SIGAC / {topic.title}</span></div>
        <span className="text-[10px] text-muted-foreground">Estrutura de referência</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex min-w-32 flex-1 items-center gap-2 rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-[11px] text-muted-foreground"><SearchIcon className="size-3.5" /> {preview.search}</div>
        {preview.filters.map((filter) => <div key={filter} className="rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-[11px] text-muted-foreground">{filter}</div>)}
        {topic.id === "relatorios" || topic.id === "acessos" || topic.id === "logs" ? <div className="flex items-center gap-2 rounded-md border border-petrobras-yellow/40 bg-petrobras-yellow/15 px-2 py-1.5 text-[11px] text-petrobras-yellow"><FileDownIcon className="size-3.5" /> Exportar</div> : null}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">{preview.columns.map((label, index) => <div key={label} className={`rounded-md px-2 py-2 text-[10px] ${index === 0 ? `${accent.surface} ${accent.label}` : "bg-background/50 text-muted-foreground"}`}>{label}</div>)}</div>
      <p className="mt-2 text-[10px] text-muted-foreground">A imagem é uma representação didática; os dados reais aparecem conforme seu perfil e seus filtros.</p>
    </div>
  )
}

export function HelpWiki() {
  const { user } = useSession()
  const { data, menus, isReady } = usePlatformContext()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("inicio")
  const [query, setQuery] = useState("")
  const visibleTopics = useMemo(
    () => topics
      .filter((topic) => menus.some((menu) => menu.rota === topic.route))
      .filter((topic) => `${topic.title} ${topic.summary} ${topic.controls.join(" ")}`.toLowerCase().includes(query.toLowerCase())),
    [menus, query],
  )
  const selected = visibleTopics.find((topic) => topic.id === selectedId) ?? visibleTopics[0]
  const profileName = roleLabel(data?.user?.perfil_nome)

  if (!user || !isReady || visibleTopics.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir Wiki de ajuda" title="Wiki de ajuda" />}><BookOpenIcon data-icon="inline-start" /></DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] lg:w-[calc(100vw-3rem)] lg:max-w-[calc(100vw-3rem)]">
        <DialogHeader className="border-b bg-muted/30 p-5 pr-12"><div className="flex items-start justify-between gap-3"><div><DialogTitle className="flex items-center gap-2 text-lg"><BookOpenIcon className="text-petrobras-green" /> Wiki de ajuda</DialogTitle><DialogDescription className="mt-2">Guias práticos para executar as rotinas do SIGAC com segurança, clareza e rastreabilidade. Perfil: {profileName}.</DialogDescription></div><Badge variant="outline" className="border-petrobras-yellow/50 text-petrobras-yellow">Ajuda contextual</Badge></div></DialogHeader>
        <div className="grid max-h-[75vh] min-h-[500px] overflow-auto md:grid-cols-[245px_1fr]">
          <aside className="border-b bg-muted/10 p-3 md:border-r md:border-b-0"><div className="relative mb-3"><SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na Wiki" className="pl-8" aria-label="Buscar na Wiki" /></div><nav aria-label="Tópicos da Wiki" className="flex max-h-64 flex-col gap-1 overflow-auto md:max-h-[440px]">{visibleTopics.map((topic) => <button key={topic.id} type="button" onClick={() => setSelectedId(topic.id)} className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${selected?.id === topic.id ? "bg-petrobras-green/15 font-semibold text-petrobras-green" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{topic.title}</button>)}</nav></aside>
          <section className="flex flex-col gap-5 p-5" aria-live="polite">{selected ? <><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-petrobras-yellow">Guia da tela</p><h3 className="text-xl font-semibold text-foreground">{selected.title}</h3><p className="mt-2 leading-6 text-muted-foreground">{selected.summary}</p></div><ScreenPreview topic={selected} /><div><h4 className="mb-2 text-sm font-semibold text-foreground">O que você está vendo</h4><p className="leading-6 text-muted-foreground">{selected.screen}</p></div><div className="rounded-xl border border-petrobras-teal/30 bg-petrobras-teal/10 p-4"><h4 className="mb-2 text-sm font-semibold text-foreground">Por que esta tela existe</h4><p className="leading-6 text-foreground">{selected.businessContext}</p></div><div><h4 className="mb-2 text-sm font-semibold text-foreground">Botões e campos</h4><ul className="flex flex-col gap-2">{selected.controls.map((control) => <li key={control} className="rounded-lg border border-border/70 bg-card px-3 py-2 text-sm leading-6 text-foreground">{control}</li>)}</ul></div><div><h4 className="mb-2 text-sm font-semibold text-foreground">Passo a passo</h4><ol className="flex flex-col gap-3">{selected.steps.map((step, index) => <li key={step} className="flex gap-3 rounded-xl border border-border/70 bg-card p-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-petrobras-green/15 text-xs font-bold text-petrobras-green">{index + 1}</span><span className="leading-6 text-foreground">{step}</span></li>)}</ol></div>{selected.action ? <div className="rounded-lg border border-petrobras-yellow/30 bg-petrobras-yellow/10 px-3 py-2 text-sm leading-6 text-foreground"><strong>Dica:</strong> {selected.action}</div> : null}<div className="mt-auto flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground"><CheckCircle2Icon className="size-4 text-petrobras-green" /> O conteúdo é filtrado pelos mesmos menus liberados para o seu perfil.</div></> : <p className="text-muted-foreground">Nenhum tópico encontrado.</p>}</section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default HelpWiki
