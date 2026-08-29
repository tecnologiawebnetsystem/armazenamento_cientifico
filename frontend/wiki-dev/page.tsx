"use client"

import { useState } from "react"
import { BookOpen, Menu, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const sections = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "execucao", label: "Execução" },
  { id: "modelo", label: "Modelo relacional" },
  { id: "endpoints", label: "Endpoints" },
  { id: "auditoria", label: "Auditoria" },
]

const guides = [
  { id: "visao-geral", title: "Backend FastAPI", description: "API única de negócio do Armazenamento Científico. O frontend não acessa o banco diretamente.", body: "A aplicação é organizada por módulos: users, projects, files, catalogs e audit. Controllers expõem HTTP, schemas validam contratos, models representam tabelas e a sessão SQLAlchemy executa consultas parametrizadas." },
  { id: "execucao", title: "Execução e migrations", description: "O schema deve ser criado e alterado exclusivamente pelo Alembic.", command: "cd backend\npython -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt\nalembic upgrade head\nuvicorn app.main:app --reload --port 8080", body: "O seed só insere dados iniciais necessários; não deve criar tabelas nem registros de demonstração. Use /health, /docs e /redoc para verificar a API." },
  { id: "modelo", title: "Modelo relacional", description: "Tabelas, chaves e integridade referencial do contrato atual.", command: "perfis (id PK) 1:N users (perfil_id FK SET NULL)\nusers (id PK) 1:N projects (created_by/owner quando aplicável)\nprojects 1:N files (project_id FK CASCADE)\nusers N:N projects por project_members (PK project_id + user_id)\nfiles N:N users por file_permissions\nusers 1:N activity_logs (user_id FK)", body: "Catálogos: perfis, modulos, permissoes, perfil_permissoes, perfil_modulos, status_projetos, tipos_projetos, configuracoes_sistema, tipos_relatorios e menus. Domínio: users, projects, project_members, files, file_permissions e activity_logs. project_members e file_permissions usam chaves compostas; arquivos filhos usam parent_id autorreferente; exclusões respeitam CASCADE, SET NULL ou RESTRICT conforme o vínculo." },
  { id: "endpoints", title: "Endpoints reais", description: "Rotas implementadas no FastAPI; a fonte viva é o OpenAPI em /docs.", command: "GET /health\nPOST /api/auth/login\nPOST /api/auth/logout\nGET /api/auth/session\nGET/PATCH /api/users\nGET /api/perfis\nGET/POST /api/projects\nGET/PATCH/DELETE /api/projects/{id}\nGET/POST/PATCH/DELETE /api/projects/{id}/members\nGET/POST/PATCH/DELETE /api/files\nGET/POST/DELETE /api/files/{id}/permissions\nGET /api/activity-logs\nGET /api/dashboard/summary\nGET /api/reports\nGET/PUT /api/permissions\nGET/PATCH /api/settings\nGET/POST/PATCH /api/access-requests", body: "Respostas 401, 403, 404, 409 e 422 devem ser tratadas pelo frontend. Nenhuma tela deve inventar dados quando a API falhar." },
  { id: "auditoria", title: "Auditoria e segurança", description: "Toda alteração relevante deve ser rastreável.", body: "activity_logs registra user_id, action, entity, entity_id, details e created_at. O backend valida a sessão pelo cookie HttpOnly wayon_session_id, aplica autorização por perfil e vínculo com projeto/arquivo, e usa CORS restrito. Não use localStorage para sessão, não exponha tokens e não altere migrations já aplicadas: crie uma nova versão." },
]

export default function DeveloperWikiPage() {
  const [active, setActive] = useState("visao-geral")
  const [menuOpen, setMenuOpen] = useState(false)
  const current = guides.find((guide) => guide.id === active) ?? guides[0]
  return <div className="min-h-screen bg-muted text-foreground"><header className="sticky top-0 z-30 border-b border-petrobras-green/20 bg-card/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4"><button className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">{menuOpen ? <X /> : <Menu />}</button><div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpen /></div><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Armazenamento Científico</p><h1 className="text-lg font-bold">Wiki Dev — Backend</h1></div></div></header><div className="mx-auto flex max-w-6xl items-start"><aside className={`${menuOpen ? "block" : "hidden"} fixed inset-x-4 top-20 z-20 rounded-xl border bg-background p-3 shadow-lg lg:sticky lg:top-20 lg:block lg:w-64 lg:shrink-0 lg:border-0 lg:bg-transparent lg:p-8 lg:shadow-none`}><nav className="flex flex-col gap-1" aria-label="Seções da wiki">{sections.map((section) => <button key={section.id} onClick={() => { setActive(section.id); setMenuOpen(false) }} className={`rounded-lg px-3 py-2 text-left text-sm ${active === section.id ? "bg-petrobras-yellow/20 font-semibold text-petrobras-green" : "text-muted-foreground hover:bg-muted"}`}>{section.label}</button>)}</nav></aside><main className="min-w-0 flex-1 px-5 py-8 lg:px-10 lg:py-12"><Badge variant="secondary">Documentação técnica</Badge><h2 className="mt-4 text-3xl font-bold tracking-tight">{current.title}</h2><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{current.description}</p><Card className="mt-8"><CardHeader><CardTitle>Contrato atual</CardTitle><CardDescription>Estado documentado do backend FastAPI.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5">{current.command && <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm leading-6"><code>{current.command}</code></pre>}<p className="whitespace-pre-line leading-7 text-muted-foreground">{current.body}</p></CardContent></Card></main></div></div>
}

