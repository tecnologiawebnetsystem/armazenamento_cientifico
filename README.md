# SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico

Aplicação web da Petrobras para gestão de projetos, mapas, arquivos, permissões, relatórios e auditoria. O frontend usa Next.js 16, TypeScript, Tailwind CSS e shadcn/ui.

## Pré-requisitos

Para executar somente o frontend:

- Node.js 20 ou superior
- npm 10 ou superior

Para executar a aplicação completa com a API e o banco local, também será necessário:

- Python 3.11 ou superior
- Docker Desktop com Docker Compose

## Rodar o frontend

Os comandos do frontend devem ser executados dentro da pasta `frontend/`. O backend permanece separado em `backend/`.

### 1. Instalar as dependências

Na primeira execução, instale as versões registradas no `package-lock.json`:

```bash
cd frontend
pnpm install
```

Se o `package-lock.json` tiver sido alterado ou não estiver disponível, use:

```bash
npm install
```

### 2. Configurar a URL da API (opcional)

Por padrão, o frontend usa as API Routes locais do Next.js. Para apontar para o backend Python, crie o arquivo `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Depois de criar ou alterar esse arquivo, reinicie o servidor do frontend. Não coloque chaves secretas em variáveis com prefixo `NEXT_PUBLIC_`, pois elas ficam disponíveis no navegador.

### 3. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). O modo de desenvolvimento oferece Hot Module Replacement: alterações nos arquivos são refletidas automaticamente no navegador.

Para iniciar em outra porta:

```bash
npm run dev -- --port 3001
```

### 4. Executar uma build de produção local

```bash
npm run build
npm run start
```

A aplicação ficará disponível em [http://localhost:3000](http://localhost:3000). A variável `NEXT_PUBLIC_API_BASE_URL`, quando usada, deve ser definida antes do `npm run build`.

### Windows PowerShell

Os mesmos comandos funcionam no PowerShell. Para definir a variável apenas na sessão atual:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:8080"
npm run dev
```

## Rodar banco, backend e frontend integrados

O backend suporta SQLite localmente e PostgreSQL/Neon em ambientes compartilhados. A escolha é feita exclusivamente no `.env` por `DATABASE_ENGINE` e `DATABASE_URL`; o código da aplicação permanece o mesmo. Para PostgreSQL/Neon, use a URL fornecida pela integração com SSL habilitado.

Para conectar o frontend ao FastAPI, crie `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Com essa variável, o frontend usa o FastAPI como fonte principal e o banco selecionado no backend (`SQLite` ou `PostgreSQL/Neon`) como persistência. As API Routes locais do Next.js permanecem apenas como fallback opcional durante o desenvolvimento. O login continua mockado conforme definido no projeto; logout e sessão são encaminhados ao backend quando o modo integrado estiver ativo.

## Scripts do frontend

```bash
npm run dev        # servidor de desenvolvimento
npm run typecheck  # verificação de tipos TypeScript
npm run lint       # análise estática com ESLint
npm run build      # build de produção
npm run start      # servidor de produção local
npm run format     # formatação dos arquivos TypeScript/TSX
```

## Ordem recomendada para executar tudo

Em um terminal, escolha SQLite ou PostgreSQL/Neon no `.env`, inicie a API seguindo a seção de backend deste README e a [`wiki-dev.md`](wiki-dev.md). Em outro terminal, execute:

```bash
cd frontend
pnpm install
pnpm dev
```

Se estiver usando o backend Python, confirme primeiro que [`http://localhost:8080/health`](http://localhost:8080/health) responde e que o `.env.local` contém `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`. Sem essa variável, o frontend continua usando as rotas locais do Next.js.

## Testes

Antes de abrir um PR, execute na raiz:

```bash
cd frontend
pnpm install
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

O smoke test frontend consulta `http://127.0.0.1:3000` e valida os fluxos públicos de login e Wiki Dev. Inicie o frontend em outro terminal antes de executar o teste. Os testes do backend e os comandos de qualidade estão documentados na seção de validação deste README e na [`wiki-dev.md`](wiki-dev.md).

## Estrutura

- `frontend/app/` — páginas, layouts e API Routes do frontend.
- `frontend/components/` — componentes por domínio e componentes shadcn/ui.
- `frontend/hooks/` — hooks client-side com SWR.
- `frontend/lib/` — tipos, cliente HTTP, sessão e utilitários.
- `frontend/public/` — imagens e arquivos estáticos.
- `backend/app/` — aplicação FastAPI, módulos, autenticação e regras de negócio.
- `backend/alembic/` — migrations versionadas do banco.
- `backend/data/` — SQLite local, não destinado à produção.
- `backend/database/` — schemas SQL de referência do backend.
- `docs/` — arquitetura, contratos, setup e diagramas.
- `wiki-dev.md` — documentação técnica consolidada.

A documentação completa dos endpoints está em `docs/api-endpoints.md`.

Para executar o ambiente completo localmente, consulte [`docs/setup-local-completo.md`](docs/setup-local-completo.md). O schema PostgreSQL está em [`backend/database/projects-schema.sql`](backend/database/projects-schema.sql), o diagrama ER editável em [`docs/database-erd.mmd`](docs/database-erd.mmd), a imagem em [`docs/database-erd.svg`](docs/database-erd.svg) e o guia de execução em [`docs/setup-local-completo.md`](docs/setup-local-completo.md).
