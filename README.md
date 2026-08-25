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

Todos os comandos abaixo devem ser executados na **raiz do projeto**, na mesma pasta deste README.

### 1. Instalar as dependências

Na primeira execução, instale as versões registradas no `package-lock.json`:

```bash
npm ci
```

Se o `package-lock.json` tiver sido alterado ou não estiver disponível, use:

```bash
npm install
```

### 2. Configurar a URL da API (opcional)

Por padrão, o frontend usa as API Routes locais do Next.js. Para apontar para o backend Python, crie o arquivo `.env.local` na raiz do projeto:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
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
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000"
npm run dev
```

## Rodar banco, backend e frontend integrados

Consulte [`backend/README.md`](backend/README.md) para subir o PostgreSQL com Docker e executar a API usando `pip` ou `uv`. Para conectar o frontend ao FastAPI, crie `.env.local` na raiz:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Com essa variável, o frontend usa o FastAPI como fonte principal e o PostgreSQL como persistência. As API Routes locais do Next.js permanecem apenas como fallback opcional durante o desenvolvimento. O login continua mockado conforme definido no projeto; logout e sessão são encaminhados ao backend quando o modo integrado estiver ativo.

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

Em um terminal, suba o PostgreSQL e a API seguindo o [`backend/README.md`](backend/README.md). Em outro terminal, na raiz do projeto, execute:

```bash
npm ci
npm run dev
```

Se estiver usando o backend Python, confirme primeiro que [`http://localhost:8000/health`](http://localhost:8000/health) responde e que o `.env.local` contém `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`. Sem essa variável, o frontend continua usando as rotas locais do Next.js.

## Estrutura

- `app/` — páginas e API Routes do frontend.
- `components/` — componentes por domínio e componentes shadcn/ui.
- `hooks/` — hooks client-side com SWR.
- `lib/` — tipos, cliente HTTP, sessão e store de demonstração.
- `database/` — schema SQL de referência.
- `docs/` — permissões e contratos de API.

A documentação completa dos endpoints está em `docs/api-endpoints.md`.

Para executar o ambiente completo localmente, consulte [`docs/setup-local-completo.md`](docs/setup-local-completo.md). O schema PostgreSQL está em [`database/projects-schema.sql`](database/projects-schema.sql), o diagrama ER editável em [`docs/database-erd.mmd`](docs/database-erd.mmd), a imagem em [`docs/database-erd.svg`](docs/database-erd.svg) e o guia de execução em [`docs/setup-local-completo.md`](docs/setup-local-completo.md).
