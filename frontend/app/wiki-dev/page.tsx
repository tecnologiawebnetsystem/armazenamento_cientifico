"use client"

import { useMemo, useState } from "react"
import { BookOpen, Check, ChevronRight, Copy, Database, FileCode2, GitBranch, Link2, LockKeyhole, Network, Search, Server, Settings2, Table2, Terminal, Wrench } from "lucide-react"

const sections = [
  { id: "overview", label: "Visão geral", icon: BookOpen },
  { id: "run", label: "Como executar", icon: Terminal },
  { id: "sqlite", label: "SQLite passo a passo", icon: Database },
  { id: "frontend", label: "Frontend", icon: GitBranch },
  { id: "backend", label: "Backend", icon: Server },
  { id: "database", label: "Banco de dados", icon: Database },
  { id: "tables", label: "Tabelas e campos", icon: Table2 },
  { id: "modeling", label: "Modelagem e diagrama", icon: Network },
  { id: "api", label: "API e endpoints", icon: Link2 },
  { id: "mapping", label: "Mapa API x frontend", icon: FileCode2 },
  { id: "auth", label: "Autenticação e permissões", icon: LockKeyhole },
  { id: "development", label: "Padrões de desenvolvimento", icon: Settings2 },
  { id: "troubleshooting", label: "Troubleshooting", icon: Wrench },
  { id: "deploy", label: "Deploy", icon: GitBranch },
] as const

type SectionId = (typeof sections)[number]["id"]
type Block = { title: string; text: string; code?: string; language?: string }
type Page = { eyebrow: string; title: string; description: string; blocks: Block[] }

const content: Record<SectionId, Page> = {
  overview: { eyebrow: "SIGAC", title: "Visão geral do projeto", description: "Sistema de Gestão de Acesso ao Armazenamento Científico, organizado em frontend Next.js e backend FastAPI.", blocks: [
    { title: "Responsabilidade de cada camada", text: "O frontend apresenta telas, navegação, formulários, estados de carregamento e mensagens. O backend recebe requisições, valida dados, aplica autenticação e permissões, executa regras de negócio e acessa o banco. O frontend nunca deve ser a única barreira de segurança." },
    { title: "Fluxo de uma operação", text: "O usuário interage com uma página em frontend/app. Um hook ou lib/api-client.ts chama um endpoint HTTP. O controller do backend valida a requisição, consulta o model/repository, registra auditoria quando necessário e devolve JSON. A tela atualiza seus estados com a resposta." },
    { title: "Convenção atual", text: "O repositório tem duas aplicações independentes: frontend/ e backend/. As tabelas não usam mais o prefixo app_. O SQLite é destinado ao desenvolvimento; PostgreSQL é a opção recomendada para ambientes compartilhados e produção." },
  ] },
  run: { eyebrow: "Primeiros passos", title: "Como executar", description: "Inicie backend e frontend em terminais separados, sempre a partir das respectivas pastas.", blocks: [
    { title: "Backend FastAPI", text: "O ambiente virtual isola as dependências Python. Depois da instalação, a migration prepara o banco antes de a API receber requisições.", code: "cd backend\npython -m venv .venv\n# Linux/macOS\nsource .venv/bin/activate\n# Windows PowerShell: .venv\\Scripts\\Activate.ps1\npip install -r requirements.txt\ncp .env.example .env\nalembic upgrade head\nuvicorn app.main:app --reload --port 8080" },
    { title: "Frontend Next.js", text: "O frontend deve apontar para a API. A variável NEXT_PUBLIC_ é pública e não pode conter segredos.", code: "cd frontend\npnpm install\n# criar frontend/.env.local\nNEXT_PUBLIC_API_BASE_URL=http://localhost:8080\npnpm dev" },
    { title: "URLs de verificação", text: "Use http://localhost:3000 para a aplicação, http://localhost:8080/docs para Swagger, http://localhost:8080/redoc para ReDoc e http://localhost:8080/health para o health check." },
  ] },
  sqlite: { eyebrow: "Banco local", title: "SQLite passo a passo", description: "O backend cria o banco local, aplica migrations e executa o seed idempotente.", blocks: [
    { title: "Configurar o .env", text: "O caminho é relativo ao diretório backend. Por isso, execute a API dentro de backend para o arquivo ficar em backend/data/sigac.db.", code: "DATABASE_ENGINE=sqlite\nDATABASE_URL=sqlite+aiosqlite:///./data/sigac.db\nSEED_DATABASE=true\nCORS_ORIGINS=http://localhost:3000\nCOOKIE_SECURE=false\nENVIRONMENT=development" },
    { title: "Criar e atualizar tabelas", text: "Alembic compara o estado versionado com o banco e aplica cada migration pendente. A migration 0002 remove o prefixo app_ em bancos antigos sem apagar registros.", code: "cd backend\nalembic upgrade head\nalembic current" },
    { title: "Seed e login local", text: "Na primeira execução, a pasta data e o arquivo SQLite são criados. O seed insere perfis e usuários iniciais somente se ainda não existirem. O login local exige que o e-mail esteja na tabela users." },
    { title: "Visualizar dados", text: "Acesse /docs para consultar a API. Para inspeção de baixo nível, abra backend/data/sigac.db no DB Browser for SQLite. Não disponibilize o arquivo .db em public/ nem em uma rota HTTP." },
    { title: "Resetar desenvolvimento", text: "Esta operação apaga os dados locais. Faça backup se precisar preservá-los.", code: "rm backend/data/sigac.db\nalembic upgrade head" },
  ] },
  frontend: { eyebrow: "Next.js 16", title: "Estrutura do frontend", description: "A aplicação web é uma instalação Next.js independente dentro de frontend/.", blocks: [
    { title: "Mapa de pastas", text: "app/ contém rotas, layouts e páginas; components/ contém componentes de UI e domínio; hooks/ contém hooks de consulta e sessão; lib/ contém cliente HTTP, tipos, navegação e estado; public/ contém assets; tests/ contém testes E2E; wiki-dev/ contém esta documentação." },
    { title: "Arquivos de configuração", text: "package.json define scripts e dependências; pnpm-lock.yaml fixa versões; tsconfig.json define TypeScript e aliases; next.config.* configura Next; postcss.config.* integra Tailwind; components.json configura shadcn/ui; .env.local guarda configuração local não versionada." },
    { title: "Como uma tela é montada", text: "A rota em app/(app)/<modulo>/page.tsx compõe componentes de components/. Para dados remotos, prefira hooks existentes e o cliente em lib/api-client.ts. Mantenha estados loading, empty e error e não coloque credenciais no navegador." },
    { title: "Comandos", text: "Execute dentro de frontend/.", code: "pnpm install\npnpm dev\npnpm typecheck\npnpm lint\npnpm build\npnpm test:e2e" },
  ] },
  backend: { eyebrow: "FastAPI", title: "Estrutura do backend", description: "API assíncrona Python com módulos por domínio, SQLAlchemy, Alembic e Pydantic.", blocks: [
    { title: "backend/app", text: "É o pacote principal da aplicação. app/main.py é o entrypoint ASGI; app/app.py monta a aplicação, middlewares e routers; app/core/ concentra configurações e segurança; app/api/ reúne dependências compartilhadas; app/db/ contém engine, sessão, base e seed." },
    { title: "backend/app/modules", text: "Cada domínio possui module.py para registrar o módulo, models.py para tabelas SQLAlchemy, schemas.py para contratos Pydantic, controller.py para rotas e service.py ou repository.py quando houver regras e acesso a dados. Os módulos atuais incluem users, projects, files e audit." },
    { title: "backend/alembic", text: "alembic.ini define a ferramenta; env.py conecta o Alembic às configurações e metadata; versions/ contém migrations incrementais. Nunca altere uma migration já aplicada: crie outra migration." },
    { title: "Pastas auxiliares", text: "tests/ contém testes de contrato, schemas e integração; data/ contém o SQLite local; .env define configuração local; requirements.txt lista dependências; README.md na raiz documenta o backend e o frontend. Em produção, data/ não deve ser tratado como armazenamento persistente confiável." },
    { title: "Comandos de qualidade", text: "Compile, confira dependências e execute testes dentro de backend.", code: "python -m compileall -q app alembic\npython -m pip check\npython -m pytest -q\nruff check ." },
  ] },
  database: { eyebrow: "Persistência", title: "Banco de dados", description: "A persistência é orientada por models SQLAlchemy e migrations Alembic.", blocks: [
    { title: "Escolha do banco", text: "SQLite usa um arquivo local e é simples para desenvolvimento individual. PostgreSQL oferece concorrência, backups e operação adequada para produção. A aplicação deve trocar DATABASE_ENGINE e DATABASE_URL, não espalhar URLs pelo código." },
    { title: "Ciclo de mudança", text: "Altere o model, crie uma migration, revise o SQL gerado, aplique em uma cópia do banco e execute os testes. Para banco legado, faça backup antes de qualquer rename ou alteração destrutiva." },
    { title: "Nomes atuais", text: "As tabelas principais são profiles, users, projects, project_members, files, file_shares e activity_logs. Relações usam chaves estrangeiras e índices para consultas de sessão, projeto e auditoria." },
  ] },
  tables: { eyebrow: "Dicionário de dados", title: "Tabelas e campos", description: "Relação consolidada das tabelas, finalidade, campos principais, páginas e endpoints consumidores.", blocks: [
    { title: "profiles", text: "Finalidade: catálogo de perfis e permissões. Campos: id (PK), name, description, permissions e timestamps. Usada por páginas de administração de perfis/permissões e pelo login/sessão. Endpoints: GET /api/profiles, POST/PATCH/DELETE /api/profiles e GET /api/permissions." },
    { title: "users", text: "Finalidade: usuários que podem iniciar sessão. Campos: id (PK), email (único), name, profile_id (FK profiles), is_active e timestamps. Usada por login, administração de usuários e sessão. Endpoints: POST /api/auth/login, GET /api/auth/session, GET/POST/PATCH/DELETE /api/users." },
    { title: "projects", text: "Finalidade: projetos científicos e seus metadados. Campos: id (PK), name, description, owner_id (FK users), status, created_at e updated_at. Usada em frontend/app/(app)/projetos e hooks/use-projects.ts. Endpoints: GET/POST /api/projects, GET/PATCH/DELETE /api/projects/{id}." },
    { title: "project_members", text: "Finalidade: associação entre usuários e projetos. Campos: id (PK), project_id (FK projects), user_id (FK users), role e created_at. Usada nos detalhes e administração de membros. Endpoints: GET/POST /api/projects/{id}/members, DELETE /api/projects/{id}/members/{user_id}." },
    { title: "files", text: "Finalidade: metadados dos arquivos científicos. Campos: id (PK), project_id (FK projects), name, path, mime_type, size, uploaded_by (FK users) e timestamps. Usada em arquivos do projeto. Endpoints: GET/POST /api/files, GET/PATCH/DELETE /api/files/{id}." },
    { title: "file_shares", text: "Finalidade: compartilhamentos e acessos concedidos a arquivos. Campos: id (PK), file_id (FK files), user_id (FK users), permission, expires_at e created_at. Usada na administração de compartilhamentos. Endpoints: GET/POST /api/files/{id}/shares e DELETE /api/files/{id}/shares/{user_id}." },
    { title: "activity_logs", text: "Finalidade: trilha de auditoria. Campos: id (PK), user_id (FK users), action, resource_type, resource_id, metadata, ip_address e created_at. Usada em frontend/components/administracao/activity-log-table.tsx e relatórios. Endpoint: GET /api/activity-logs." },
    { title: "Como confirmar no código", text: "Os nomes físicos devem ser conferidos em backend/app/modules/*/models.py, a estrutura declarativa em database/sqlite-schema.sql e o histórico em backend/alembic/versions/. Os schemas Pydantic mostram os campos expostos pela API, que podem ser diferentes dos campos internos." },
  ] },
  modeling: { eyebrow: "Modelo relacional", title: "Modelagem e diagrama do banco", description: "O relacionamento central parte de users e projects, com tabelas de associação e auditoria.", blocks: [
    { title: "Diagrama ER", text: "Este diagrama representa as relações lógicas. A fonte editável está em docs/database-erd.mmd e a versão SVG em docs/database-erd.svg.", code: "erDiagram\n  profiles ||--o{ users : possui\n  users ||--o{ projects : cria\n  users ||--o{ project_members : participa\n  projects ||--o{ project_members : possui\n  projects ||--o{ files : armazena\n  files ||--o{ file_shares : compartilha\n  users ||--o{ file_shares : recebe\n  users ||--o{ activity_logs : gera" },
    { title: "Decisões de modelagem", text: "project_members e file_shares resolvem relações muitos-para-muitos e permitem guardar atributos da relação, como role e permission. activity_logs é append-only: novos eventos são inseridos e não devem ser editados pelo fluxo normal. E-mails são únicos para impedir dois usuários com a mesma identidade." },
    { title: "Integridade", text: "FKs evitam registros órfãos, índices aceleram filtros por project_id, user_id e created_at, e validações do backend impedem acesso a um projeto que não pertence à sessão. A existência de uma FK não substitui a verificação de autorização." },
  ] },
  api: { eyebrow: "Contrato OpenAPI", title: "API e endpoints usados", description: "Lista consolidada das rotas públicas da aplicação. A fonte viva permanece em /docs e /openapi.json.", blocks: [
    { title: "Sessão e saúde", text: "GET /health — verifica disponibilidade. POST /api/auth/login — inicia sessão por e-mail. POST /api/auth/logout — encerra sessão. GET /api/auth/session — retorna usuário atual." },
    { title: "Usuários e perfis", text: "GET/POST /api/users; GET/PATCH/DELETE /api/users/{id}; GET /api/profiles; POST/PATCH/DELETE /api/profiles/{id}; GET /api/permissions. Uso: administração, login e autorização." },
    { title: "Projetos e membros", text: "GET/POST /api/projects; GET/PATCH/DELETE /api/projects/{id}; GET/POST /api/projects/{id}/members; DELETE /api/projects/{id}/members/{user_id}. Uso: lista, detalhe e gestão de participantes." },
    { title: "Arquivos e compartilhamentos", text: "GET/POST /api/files; GET/PATCH/DELETE /api/files/{id}; GET/POST /api/files/{id}/shares; DELETE /api/files/{id}/shares/{user_id}. Uso: arquivos científicos, metadados e permissões de compartilhamento." },
    { title: "Auditoria e relatórios", text: "GET /api/activity-logs — consulta eventos. GET /api/reports/summary e GET /api/reports/projects — dados agregados para relatórios e dashboard." },
    { title: "Códigos de resposta", text: "200/201 indicam sucesso; 400 payload ou regra inválida; 401 sessão ausente; 403 permissão insuficiente; 404 recurso não encontrado; 409 conflito; 422 validação de schema; 500 erro inesperado. O frontend deve tratar loading, erro e resposta vazia." },
  ] },
  mapping: { eyebrow: "Integração", title: "Mapa API x frontend", description: "Arquivos que consomem os endpoints e páginas onde os dados são apresentados.", blocks: [
    { title: "Cliente e sessão", text: "frontend/lib/api-client.ts centraliza chamadas HTTP e serialização. frontend/hooks/use-session.ts consulta a sessão. frontend/app/login/page.tsx apresenta o login; frontend/app/(app)/layout.tsx protege a área autenticada." },
    { title: "Usuários e permissões", text: "hooks/use-users.ts e hooks/use-permissions.ts alimentam as páginas de administração. components/administracao/ reúne tabelas e ações para esses domínios. O backend correspondente é modules/users/controller.py e modules/users/models.py." },
    { title: "Projetos", text: "hooks/use-projects.ts, hooks/use-project.ts e hooks/use-project-members.ts consomem /api/projects e membros. As páginas ficam em frontend/app/(app)/projetos/ e componentes relacionados em frontend/components/projetos/." },
    { title: "Arquivos e auditoria", text: "hooks/use-files.ts consome /api/files; hooks/use-activity-logs.ts e components/administracao/activity-log-table.tsx consomem /api/activity-logs. Relatórios ficam em frontend/app/(app)/relatorios/." },
    { title: "Como rastrear uma chamada", text: "Comece pelo hook, siga para a função em lib/api-client.ts, localize o path no controller Python e então o model/repository. Para uma nova tela, registre a relação nesta seção e atualize a documentação do endpoint." },
  ] },
  auth: { eyebrow: "Segurança", title: "Autenticação e permissões", description: "O backend é a autoridade para sessão, identidade e autorização.", blocks: [
    { title: "Login", text: "O login local recebe um e-mail, procura um usuário ativo em users e cria uma sessão HttpOnly. O e-mail precisa existir; não há cadastro automático pelo frontend. Em produção, o fluxo deve ser conectado ao provedor corporativo aprovado." },
    { title: "Perfis e escopo", text: "O usuário recebe um profile_id e permissões associadas. Cada consulta de recurso deve verificar o usuário da sessão e o vínculo com o projeto/arquivo. Um botão oculto no frontend não é controle de acesso." },
    { title: "Boas práticas", text: "Use HTTPS, cookies Secure e SameSite apropriado, CORS restrito, validação Pydantic, queries parametrizadas, logs sem tokens e princípio do menor privilégio. Nunca use localStorage para sessão ou segredos." },
  ] },
  development: { eyebrow: "Contribuição", title: "Padrões de desenvolvimento", description: "Mudanças devem ser pequenas, tipadas, testáveis e refletidas nesta Wiki.", blocks: [
    { title: "Nova tabela", text: "Adicione model, migration, schema, repository/service, controller, testes e entrada no dicionário de dados. Verifique banco vazio e banco já populado." },
    { title: "Novo endpoint", text: "Defina método, path, autenticação, payload, respostas e erros. Implemente no controller, conecte ao cliente/hook do frontend, atualize o mapa API x frontend e valide em /docs." },
    { title: "Nova página", text: "Crie a rota em frontend/app, extraia componentes reutilizáveis, use tokens visuais existentes e inclua loading, vazio, erro, acessibilidade e responsividade." },
    { title: "Checklist", text: "Execute typecheck, lint, build, testes Python e E2E. Teste login, permissão, criação, atualização, exclusão e comportamento sem backend." },
  ] },
  troubleshooting: { eyebrow: "Diagnóstico", title: "Troubleshooting", description: "Diagnóstico organizado para os problemas mais frequentes.", blocks: [
    { title: "Preview não abre", text: "Confirme que o Next foi iniciado dentro de frontend, que pnpm install terminou e que a porta está livre. Reinicie o servidor após alterar package.json ou variáveis de ambiente." },
    { title: "Frontend sem dados", text: "Confirme backend em :8080, NEXT_PUBLIC_API_BASE_URL em frontend/.env.local e CORS_ORIGINS incluindo http://localhost:3000. Verifique /health e o console/network do navegador." },
    { title: "SQLite ou migration falha", text: "Execute alembic current e alembic history dentro de backend. Confira permissões de escrita em backend/data e faça backup antes de tocar em um banco existente." },
    { title: "401 ou 403", text: "401 significa sessão ausente ou expirada; 403 significa perfil sem permissão. Confirme o e-mail seed, cookie, origem CORS e autorização no controller — não corrija removendo a proteção." },
    { title: "Build falha", text: "Rode pnpm typecheck para tipos, pnpm lint para regras e pnpm build para o bundle. Leia o primeiro erro real; avisos posteriores podem ser consequência dele." },
  ] },
  deploy: { eyebrow: "Produção", title: "Deploy", description: "Frontend e backend devem ser publicados como serviços separados, com configuração explícita.", blocks: [
    { title: "Frontend", text: "Configure NEXT_PUBLIC_API_BASE_URL com a URL HTTPS pública da API. Execute build dentro de frontend e publique o resultado conforme o provedor. Não inclua .env.local ou segredos no bundle." },
    { title: "Backend", text: "Use PostgreSQL, execute migrations como etapa controlada, configure CORS apenas para o domínio do frontend, habilite cookies Secure, desabilite seed automático após a carga inicial e monitore /health." },
    { title: "Release segura", text: "Faça backup, revise migration, valide variáveis, teste login e autorização, confirme logs sem dados sensíveis, monitore erros e mantenha plano de rollback. SQLite não deve ser a base de uma implantação com múltiplas instâncias." },
  ] },
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return <div className="relative mt-4"><pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 pr-14 text-sm leading-6 text-slate-100"><code>{code}</code></pre><button type="button" aria-label="Copiar código" onClick={() => { void navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500) }} className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</button></div>
}

export default function DeveloperWikiPage() {
  const [active, setActive] = useState<SectionId>("overview")
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => sections.filter((section) => `${section.label} ${content[section.id].title} ${content[section.id].description} ${content[section.id].blocks.map((block) => `${block.title} ${block.text}`).join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query])
  const page = content[active]
  return <main className="min-h-screen bg-slate-50 text-slate-950"><div className="mx-auto flex min-h-screen max-w-[1500px] flex-col lg:flex-row"><aside className="w-full shrink-0 border-b border-slate-200 bg-white p-6 lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r"><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">SIGAC</p><h1 className="mt-2 text-2xl font-bold tracking-tight">Wiki Dev</h1><p className="mt-2 text-sm leading-6 text-slate-500">Documentação técnica centralizada, sem duplicação, para desenvolver, executar e publicar o sistema.</p></div><label className="relative block"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na documentação" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none ring-orange-500 transition focus:ring-2" /></label><nav aria-label="Seções da Wiki Dev" className="mt-6 flex flex-col gap-1">{filtered.map((section) => { const Icon = section.icon; return <button key={section.id} type="button" onClick={() => setActive(section.id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active === section.id ? "bg-orange-50 font-semibold text-orange-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><Icon className="size-4 shrink-0" /><span className="flex-1">{section.label}</span>{active === section.id && <ChevronRight className="size-4" />}</button> })}</nav>{filtered.length === 0 && <p className="mt-6 text-sm text-slate-500">Nenhuma seção encontrada.</p>}</aside><section className="min-w-0 flex-1 px-6 py-10 sm:px-10 lg:px-16 lg:py-14"><div className="mx-auto max-w-4xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600"><span>{page.eyebrow}</span><span className="text-slate-300">/</span><span className="text-slate-400">documentação técnica</span></div><h2 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">{page.title}</h2><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{page.description}</p><div className="mt-10 flex flex-col gap-5">{page.blocks.map((block, index) => <article key={`${active}-${block.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><h3 className="text-lg font-semibold">{block.title}</h3><p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-slate-600">{block.text}</p>{block.code && <CodeBlock code={block.code} />}</div></div></article>)}</div></div></section></div></main>
}
