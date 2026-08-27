# Frontend — SIGAC

Aplicação Next.js do SIGAC. O backend Python fica na pasta `../backend`.

## Pré-requisitos

- Node.js 20+
- pnpm

## Instalação e execução

```bash
cd frontend
pnpm install
pnpm dev
```

Abra `http://localhost:3000`.

Para usar a API Python, crie `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## Validação

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

## Estrutura

- `app/`: páginas e rotas Next.js
- `components/`: componentes visuais
- `hooks/`: hooks de dados
- `lib/`: cliente da API e tipos
- `wiki-dev/`: documentação interna
- `tests/`: testes E2E

Consulte `../backend/README.md` para executar a API e o SQLite.
