# Armazenamento Científico

Plataforma web para gestão de projetos, mapas, arquivos, permissões, relatórios e auditoria. O frontend usa Next.js 16, TypeScript, Tailwind CSS e shadcn/ui. O backend opcional e compatível fica em `backend/`, usando FastAPI.

## Pré-requisitos

- Node.js 20+
- npm 10+
- Python 3.11+ (somente para o backend FastAPI)

## Rodar o frontend

Na raiz do projeto:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Para usar as API Routes incluídas no frontend, não configure nada. Para apontar o frontend para o FastAPI, defina `NEXT_PUBLIC_API_BASE_URL` no ambiente do frontend, por exemplo:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

O frontend chama sempre os paths `/api/...`; o FastAPI deve estar rodando em paralelo.

## Rodar o backend FastAPI

Em outro terminal:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\\Scripts\\activate
pip install -e .
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Documentação interativa: `http://localhost:8000/docs`
Health check: `http://localhost:8000/health`

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
- `backend/` — serviço FastAPI compatível com os contratos `/api`.
- `database/` — schema SQL de referência.
- `docs/` — permissões e contratos de API.

## Perfis de demonstração

O modo protótipo possui usuários de exemplo na tela de login. Os dados são mantidos em memória e reiniciados ao reiniciar o processo. Não use essas credenciais em produção.

## Produção

Antes do deploy, substituir o store em memória por banco transacional, configurar autenticação real, restringir CORS, usar variáveis de ambiente e executar `npm run typecheck`, `npm run lint` e `npm run build`.

A documentação completa dos endpoints está em `docs/api-endpoints.md`.

## Componentes shadcn/ui

```bash
npx shadcn@latest add button
```

Importe com o alias do projeto:

```tsx
import { Button } from "@/components/ui/button"
```
