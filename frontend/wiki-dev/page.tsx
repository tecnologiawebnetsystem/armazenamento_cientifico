"use client"

import { useState } from "react"
import { BookOpen, Database, Menu, Server, SquareTerminal, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const sections = [
  { id: "visao-geral", label: "Visão geral", icon: BookOpen },
  { id: "execucao", label: "Rodar o sistema", icon: SquareTerminal },
  { id: "sqlite-guia", label: "SQLite passo a passo", icon: Database },
  { id: "endpoints", label: "Endpoints da API", icon: Server },
  { id: "auditoria", label: "Auditoria e logs", icon: Database },
]

const guides = [
  { id: "visao-geral", title: "Visão geral", description: "Documentação interna para entender, instalar e evoluir o Armazenamento Científico." },
  { id: "execucao", title: "Rodar o sistema", description: "O frontend roda em uma pasta própria e conversa com o backend FastAPI pela API HTTP.", command: "cd frontend\npnpm install\npnpm dev\n\n# em outro terminal\ncd backend\nuvicorn app.main:app --reload --port 8080" },
  { id: "sqlite-guia", title: "SQLite passo a passo", description: "O SQLite é o banco local usado para desenvolvimento. O backend cria a pasta data, aplica a estrutura e executa o seed idempotente.", command: "cd backend\npython -m venv .venv\nsource .venv/bin/activate  # Windows: .venv\\Scripts\\Activate.ps1\npip install -r requirements.txt\n\n# crie backend/.env a partir do exemplo\nDATABASE_ENGINE=sqlite\nDATABASE_URL=sqlite+aiosqlite:///./data/sigac.db\nSEED_DATABASE=true\n\nalembic upgrade head\nuvicorn app.main:app --reload --port 8080" },
  { id: "endpoints", title: "Endpoints da API", description: "A documentação interativa da API fica disponível no navegador quando o backend está rodando.", command: "http://localhost:8080/docs\nhttp://localhost:8080/health" },
  { id: "auditoria", title: "Auditoria e logs", description: "A tabela activity_logs registra as ações realizadas na plataforma para rastreabilidade e conformidade.", command: "Tabela: activity_logs\n\nCampos principais:\nid           — identificador do evento\nuser_id      — usuário responsável\naction       — ação executada\nentity       — entidade afetada\nentity_id    — identificador da entidade\ndetails      — detalhes adicionais\ncreated_at   — data e hora do evento\n\nEndpoint de consulta:\nGET /api/activity-logs\n\nAções registradas incluem login, logout, criação e edição de projetos, alterações de status, gestão de membros, permissões de arquivos, alterações de usuários e exportações." },
]

export default function DeveloperWikiPage() {
  const [active, setActive] = useState("visao-geral")
  const [menuOpen, setMenuOpen] = useState(false)
  const current = guides.find((guide) => guide.id === active) ?? guides[0]
  const goTo = (id: string) => { setActive(id); setMenuOpen(false) }

  return <div className="min-h-screen bg-[#f5f7f8] text-slate-900"><header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-[1500px] items-center gap-4 px-5 py-4 lg:px-8"><button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">{menuOpen ? <X /> : <Menu />}</button><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-700 text-white"><BookOpen /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Armazenamento Científico</p><h1 className="text-lg font-bold">Wiki Dev</h1></div></div></header><div className="mx-auto flex max-w-[1500px] items-start lg:min-h-[calc(100vh-73px)]"><aside className={`${menuOpen ? "block" : "hidden"} fixed inset-x-4 top-20 z-20 rounded-xl border border-slate-200 bg-white p-3 shadow-lg lg:sticky lg:top-[89px] lg:block lg:w-72 lg:shrink-0 lg:border-0 lg:bg-transparent lg:p-8 lg:shadow-none`}><nav className="flex flex-col gap-1" aria-label="Seções da wiki">{sections.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => goTo(id)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${active === id ? "bg-emerald-100 text-emerald-900" : "text-slate-600 hover:bg-slate-100"}`}><Icon className="size-4" />{label}</button>)}</nav></aside><main className="min-w-0 flex-1 px-5 py-8 lg:px-10 lg:py-12"><div className="max-w-4xl"><Badge variant="secondary">Documentação interna</Badge><h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{current.title}</h2><p className="mt-3 max-w-2xl leading-7 text-slate-600">{current.description}</p><Card className="mt-8"><CardHeader><CardTitle>{current.id === "sqlite-guia" ? "Como preparar o SQLite" : "Informações"}</CardTitle><CardDescription>Conteúdo da seção selecionada no menu lateral.</CardDescription></CardHeader>{current.command && <CardContent><pre className="overflow-x-auto rounded-lg bg-slate-950 p-5 text-sm leading-6 text-slate-100"><code>{current.command}</code></pre></CardContent>}</Card>{current.id === "sqlite-guia" && <Card className="mt-4"><CardHeader><CardTitle>Visualizar o banco pelo navegador</CardTitle><CardDescription>Com o backend ligado, acesse <code>http://localhost:8080/docs</code>. Ali você pode executar as rotas autorizadas e visualizar usuários, projetos, arquivos e logs retornados pela API. O arquivo SQLite não deve ser exposto diretamente.</CardDescription></CardHeader></Card>}</div></main></div></div>
}
