# Armazenamento Científico

Plataforma web para gestão de projetos, arquivos e permissões de uma instituição de pesquisa científica (identidade visual Petrobras). Construída com Next.js (App Router), TypeScript, Tailwind CSS e shadcn/ui.

## Pré-requisitos

- Node.js 20 ou superior
- npm (o projeto usa `package-lock.json`)

## Como rodar localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

3. Acesse [http://localhost:3000](http://localhost:3000) no navegador. Você será redirecionado para a tela de login (`/login`), que possui botões de acesso rápido para os perfis de demonstração (Administrador, Gestor, Participante e Visualizador).

Não há variáveis de ambiente obrigatórias para rodar em modo de demonstração — os dados são simulados em memória (`lib/mock-data.ts`, `lib/store.ts`). Opcionalmente, é possível definir `NEXT_PUBLIC_API_BASE_URL` caso a API seja servida em uma origem diferente do próprio app.

## Outros scripts disponíveis

```bash
npm run build      # build de produção
npm run start       # inicia o build de produção (após "npm run build")
npm run lint         # roda o ESLint
npm run typecheck  # verifica os tipos com tsc --noEmit
npm run format      # formata o código com Prettier
```

## Estrutura do projeto

- `app/(app)/` — páginas autenticadas: `dashboard`, `projetos`, `administracao` (usuários, permissões, parâmetros, logs, solicitações de acesso), `perfil` e `solicitar-acesso`.
- `app/login/` — tela de login.
- `app/api/` — rotas de API (auth, projects, files, users, permissions, settings, activity-logs, access-requests).
- `components/` — componentes de UI organizados por domínio (`layout`, `projects`, `brand`, `ui` do shadcn, etc.).
- `hooks/` — hooks de dados client-side com SWR (`use-files`, `use-session`, `use-permissions`, etc.).
- `lib/` — tipos, dados simulados, cliente de API e utilitários.
- `docs/perfis-e-permissoes.txt` — documentação detalhada dos papéis (Admin, Gestor, Participante, Visualizador) e do que cada um pode acessar.

## Adicionando componentes shadcn/ui

Para adicionar novos componentes de UI, execute:

```bash
npx shadcn@latest add button
```

Isso colocará os componentes na pasta `components/ui`.

Para usá-los, importe normalmente:

```tsx
import { Button } from "@/components/ui/button";
```
