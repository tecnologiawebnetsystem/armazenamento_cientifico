# Armazenamento Científico

Plataforma web para gestão de projetos, mapas, arquivos, permissões, relatórios e auditoria. O frontend usa Next.js 16, TypeScript, Tailwind CSS e shadcn/ui.

## Pré-requisitos

- Node.js 20+
- npm 10+
- Python 3.11+
- Docker e Docker Compose (para o PostgreSQL local)

## Rodar o frontend

Na raiz do projeto:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Rodar banco e backend

Consulte [`backend/README.md`](backend/README.md) para subir o PostgreSQL com Docker e executar a API usando `pip` (padrão, sem `uv`) ou `uv` (alternativa). A documentação também explica como aplicar o schema quando o volume do Docker já existe.

## Scripts do frontend

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
npm run format
```

## Estrutura

- `app/` — páginas e API Routes do frontend.
- `components/` — componentes por domínio e componentes shadcn/ui.
- `hooks/` — hooks client-side com SWR.
- `lib/` — tipos, cliente HTTP, sessão e store de demonstração.
- `database/` — schema SQL de referência.
- `docs/` — permissões e contratos de API.

A documentação completa dos endpoints está em `docs/api-endpoints.md`.
