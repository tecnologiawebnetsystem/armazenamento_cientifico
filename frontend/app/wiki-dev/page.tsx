"use client"

import { useMemo, useState } from "react"
import { BookOpen, Check, ChevronRight, Copy, Database, GitBranch, LockKeyhole, Search, Server, Settings2, Terminal, Wrench } from "lucide-react"

const sections = [
  { id: "overview", label: "Visão geral", icon: BookOpen },
  { id: "run", label: "Como executar", icon: Terminal },
  { id: "sqlite", label: "SQLite passo a passo", icon: Database },
  { id: "frontend", label: "Frontend", icon: GitBranch },
  { id: "backend", label: "Backend", icon: Server },
  { id: "database", label: "Banco de dados", icon: Database },
  { id: "api", label: "API", icon: Server },
  { id: "auth", label: "Autenticação e permissões", icon: LockKeyhole },
  { id: "development", label: "Padrões de desenvolvimento", icon: Settings2 },
  { id: "troubleshooting", label: "Troubleshooting", icon: Wrench },
  { id: "deploy", label: "Deploy", icon: GitBranch },
] as const

type SectionId = (typeof sections)[number]["id"]

type Block = { title: string; text: string; code?: string }

const content: Record<SectionId, { eyebrow: string; title: string; description: string; blocks: Block[] }> = {
  overview: { eyebrow: "SIGAC", title: "Visão geral do projeto", description: "Sistema de Gestão de Acesso ao Armazenamento Científico, separado em frontend Next.js e backend FastAPI.", blocks: [
    { title: "Arquitetura", text: "O frontend fica em frontend/ e cuida das telas, navegação e consumo da API. O backend fica em backend/ e concentra autenticação, regras de negócio, persistência e documentação OpenAPI." },
    { title: "Fluxo principal", text: "O usuário acessa o frontend, realiza login por e-mail e as telas consultam o FastAPI. Em desenvolvimento, o banco padrão é SQLite; em ambientes compartilhados, use PostgreSQL." },
    { title: "Pastas importantes", text: "frontend/app contém páginas e rotas; frontend/components contém componentes; frontend/lib concentra cliente HTTP e tipos; backend/app contém módulos, API e banco; backend/alembic contém migrations." },
  ] },
  run: { eyebrow: "Primeiros passos", title: "Como executar", description: "Suba o backend primeiro e depois o frontend em terminais separados.", blocks: [
    { title: "Backend", text: "No terminal 1, crie o ambiente virtual, instale dependências, configure o .env, aplique migrations e inicie a API.", code: "cd backend\npython -m venv .venv\n# Linux/macOS\nsource .venv/bin/activate\n# Windows PowerShell: .venv\\Scripts\\Activate.ps1\npip install -r requirements.txt\ncp .env.example .env\nalembic upgrade head\nuvicorn app.main:app --reload --port 8080" },
    { title: "Frontend", text: "No terminal 2, instale dependências e inicie o Next.js. Configure NEXT_PUBLIC_API_BASE_URL se quiser usar o backend Python.", code: "cd frontend\npnpm install\n# frontend/.env.local\nNEXT_PUBLIC_API_BASE_URL=http://localhost:8080\npnpm dev" },
    { title: "URLs úteis", text: "Frontend: http://localhost:3000. Swagger: http://localhost:8080/docs. ReDoc: http://localhost:8080/redoc. Saúde da API: http://localhost:8080/health." },
  ] },
  sqlite: { eyebrow: "Banco local", title: "SQLite passo a passo", description: "O SQLite é criado automaticamente para desenvolvimento local. Não é necessário criar tabelas manualmente.", blocks: [
    { title: "1. Configure o ambiente", text: "Copie backend/.env.example para backend/.env e confirme que o banco está configurado como SQLite.", code: "DATABASE_ENGINE=sqlite\nDATABASE_URL=sqlite+aiosqlite:///./data/sigac.db\nSEED_DATABASE=true\nCORS_ORIGINS=http://localhost:3000\nCOOKIE_SECURE=false\nENVIRONMENT=development" },
    { title: "2. Crie a estrutura", text: "A migration cria ou atualiza as tabelas. O comando deve ser executado dentro de backend com o ambiente virtual ativo.", code: "cd backend\nalembic upgrade head" },
    { title: "3. Inicie a API", text: "Na primeira inicialização, backend/data é criado e o seed idempotente insere os registros iniciais sem duplicá-los.", code: "uvicorn app.main:app --reload --host 0.0.0.0 --port 8080" },
    { title: "4. Consulte os dados", text: "Use Swagger para executar endpoints autorizados em /docs. O arquivo físico fica em backend/data/sigac.db. Para inspeção avançada, use DB Browser for SQLite; não exponha o arquivo publicamente." },
    { title: "Resetar somente o banco local", text: "Pare a API, remova backend/data/sigac.db e execute novamente a migration. Faça isso apenas em desenvolvimento, pois a ação apaga os dados locais.", code: "rm backend/data/sigac.db\nalembic upgrade head" },
  ] },
  frontend: { eyebrow: "Next.js 16", title: "Frontend", description: "Aplicação web em TypeScript, Tailwind CSS, shadcn/ui e SWR.", blocks: [
    { title: "Comandos", text: "Execute todos os comandos dentro de frontend/.", code: "pnpm install\npnpm dev\npnpm typecheck\npnpm lint\npnpm build\npnpm test:e2e" },
    { title: "Configuração", text: "A variável pública aponta o cliente para a API. Nunca coloque segredos em variáveis NEXT_PUBLIC_, pois elas chegam ao navegador.", code: "NEXT_PUBLIC_API_BASE_URL=http://localhost:8080" },
    { title: "Organização", text: "Use app/ para rotas, components/ para UI reutilizável, hooks/ para dados sincronizados, lib/ para tipos e clientes, e wiki-dev/ para esta documentação." },
  ] },
  backend: { eyebrow: "FastAPI", title: "Backend", description: "API REST assíncrona com SQLAlchemy, Alembic e validação Pydantic.", blocks: [
    { title: "Execução", text: "O entrypoint é app.main:app. O modo --reload serve apenas para desenvolvimento. Em produção, use um processo gerenciado e HTTPS." },
    { title: "Camadas", text: "Controllers recebem requisições, services aplicam regras, repositories acessam dados e schemas validam contratos. Evite SQL diretamente nos handlers." },
    { title: "Qualidade", text: "Compile e valide o backend antes de abrir um PR.", code: "cd backend\npython -m compileall -q app alembic\npython -m pip check\npython -m pytest -q\nruff check ." },
  ] },
  database: { eyebrow: "Persistência", title: "Banco de dados", description: "SQLite é indicado para desenvolvimento local; PostgreSQL é recomendado para servidor e produção.", blocks: [
    { title: "Tabelas principais", text: "O banco contém usuários, perfis, projetos, membros, arquivos, compartilhamentos e logs de auditoria. Os nomes das tabelas não usam mais o prefixo app_." },
    { title: "Migrations", text: "Nunca edite uma migration já aplicada. Crie uma nova migration e execute upgrade head. A migration de remoção do prefixo preserva dados existentes ao renomear tabelas legadas." },
    { title: "PostgreSQL", text: "Em servidor, altere apenas as variáveis de ambiente, desative o seed automático após a carga controlada e aplique as migrations antes de iniciar a API.", code: "DATABASE_ENGINE=postgres\nDATABASE_URL=postgresql+asyncpg://usuario:senha@host:5432/sigac\nSEED_DATABASE=false" },
  ] },
  api: { eyebrow: "Contrato OpenAPI", title: "API", description: "A documentação viva está em /docs e o contrato bruto em /openapi.json.", blocks: [
    { title: "Saúde e sessão", text: "GET /health verifica a API. POST /api/auth/login cria a sessão. POST /api/auth/logout encerra. GET /api/auth/session consulta o usuário atual." },
    { title: "Domínios", text: "Projetos usam /api/projects; arquivos usam /api/files; usuários usam /api/users; auditoria usa /api/activity-logs; relatórios usam /api/reports; permissões usam /api/permissions." },
    { title: "Erros", text: "401 indica sessão ausente, 403 falta de permissão, 404 recurso inexistente, 409 conflito e 422 payload inválido. Valide sempre o corpo de resposta antes de exibir uma mensagem ao usuário." },
  ] },
  auth: { eyebrow: "Segurança", title: "Autenticação e permissões", description: "O acesso é controlado por sessão HttpOnly e pelo perfil associado ao usuário.", blocks: [
    { title: "Login", text: "O login local usa o e-mail existente na tabela de usuários. Os usuários seed servem para desenvolvimento. Em produção, substitua o fluxo de demonstração por uma autenticação corporativa real." },
    { title: "Perfis", text: "Administrador gerencia configurações e permissões; gerente administra projetos; auditor consulta registros; patrocinador acompanha informações autorizadas. As regras finais devem ser conferidas no backend." },
    { title: "Boas práticas", text: "Restrinja cada consulta ao usuário da sessão, valide IDs e payloads no servidor, mantenha cookies seguros em HTTPS e nunca confie somente em controles visuais do frontend." },
  ] },
  development: { eyebrow: "Contribuição", title: "Padrões de desenvolvimento", description: "Mantenha mudanças pequenas, tipadas, testáveis e documentadas.", blocks: [
    { title: "Nova tela", text: "Crie a rota em frontend/app, extraia a UI para components e use hooks existentes para dados. Mantenha estados de carregamento, vazio e erro." },
    { title: "Nova API", text: "Adicione schema, repository, service, controller/router e testes. Atualize o contrato e a Wiki quando o endpoint for público." },
    { title: "Checklist", text: "Teste o fluxo no navegador, execute typecheck, lint, build e testes do backend. Verifique migrations em banco vazio e em uma cópia de banco existente." },
  ] },
  troubleshooting: { eyebrow: "Diagnóstico", title: "Troubleshooting", description: "Soluções rápidas para os problemas mais comuns durante o desenvolvimento.", blocks: [
    { title: "Preview não abre", text: "Confirme que está na pasta frontend, que as dependências foram instaladas e que o servidor Next está ativo. Se a porta 3000 estiver ocupada, use pnpm dev -- --port 3001." },
    { title: "Frontend sem dados", text: "Confirme backend/.env, backend em :8080, frontend/.env.local com NEXT_PUBLIC_API_BASE_URL e CORS_ORIGINS contendo a origem do frontend. Reinicie o Next após alterar variáveis." },
    { title: "SQLite não aparece", text: "Execute alembic upgrade head dentro de backend e confira permissões de escrita. A pasta data é relativa ao diretório em que a API foi iniciada." },
    { title: "Migration falha", text: "Confira o histórico com alembic current e alembic history. Faça backup antes de corrigir um banco existente; nunca apague o arquivo em produção." },
  ] },
  deploy: { eyebrow: "Produção", title: "Deploy", description: "Antes de publicar, separe claramente variáveis, banco e processo de execução.", blocks: [
    { title: "Frontend", text: "Configure a URL pública do backend, execute build e publique o diretório frontend conforme o provedor. Não publique arquivos .env locais." },
    { title: "Backend", text: "Use PostgreSQL, HTTPS, cookies Secure, seed desabilitado após a carga inicial e migrations executadas como etapa controlada de release." },
    { title: "Checklist de release", text: "Backup do banco; migrations revisadas; CORS restrito; logs sem segredos; health check monitorado; testes de login, permissões, projetos e arquivos executados." },
  ] },
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return <div className="relative mt-4"><pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 pr-14 text-sm leading-6 text-slate-100"><code>{code}</code></pre><button type="button" aria-label="Copiar comando" onClick={() => { void navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</button></div>
}

export default function DeveloperWikiPage() {
  const [active, setActive] = useState<SectionId>("overview")
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => sections.filter((section) => `${section.label} ${content[section.id].title} ${content[section.id].description} ${content[section.id].blocks.map((block) => `${block.title} ${block.text}`).join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query])
  const page = content[active]
  return <main className="min-h-screen bg-slate-50 text-slate-950"><div className="mx-auto flex min-h-screen max-w-[1500px] flex-col lg:flex-row"><aside className="w-full shrink-0 border-b border-slate-200 bg-white p-6 lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r"><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">SIGAC</p><h1 className="mt-2 text-2xl font-bold tracking-tight">Wiki Dev</h1><p className="mt-2 text-sm leading-6 text-slate-500">Documentação técnica centralizada para desenvolver, executar e publicar o sistema.</p></div><label className="relative block"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na documentação" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none ring-orange-500 transition focus:ring-2" /></label><nav aria-label="Seções da Wiki Dev" className="mt-6 flex flex-col gap-1">{filtered.map((section) => { const Icon = section.icon; return <button key={section.id} type="button" onClick={() => setActive(section.id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active === section.id ? "bg-orange-50 font-semibold text-orange-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><Icon className="size-4 shrink-0" /><span className="flex-1">{section.label}</span>{active === section.id && <ChevronRight className="size-4" />}</button> })}</nav>{filtered.length === 0 && <p className="mt-6 text-sm text-slate-500">Nenhuma seção encontrada.</p>}</aside><section className="min-w-0 flex-1 px-6 py-10 sm:px-10 lg:px-16 lg:py-14"><div className="mx-auto max-w-4xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600"><span>{page.eyebrow}</span><span className="text-slate-300">/</span><span>Documentação</span></div><h2 className="mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{page.title}</h2><p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{page.description}</p><div className="mt-10 flex flex-col gap-5">{page.blocks.map((block) => <article key={block.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">{block.title}</h3><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{block.text}</p>{block.code && <CodeBlock code={block.code} />}</article>)}</div></div></section></div></main>
}
