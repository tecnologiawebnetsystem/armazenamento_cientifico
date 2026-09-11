# SIGAC Front-end

Aplicação web do SIGAC, construída com Next.js, React, TypeScript, Tailwind CSS e shadcn/ui.

## Desenvolvimento local

```bash
npm ci
cp .env.example .env.local
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`. Configure `NEXT_PUBLIC_API_BASE_URL` para apontar para a API do back-end, normalmente `http://localhost:8080`.

## Validação

```bash
npm run typecheck
npm run lint
npm run build
```

## Docker

Para executar apenas o front-end em produção:

```bash
docker compose up --build
```

A imagem usa o modo standalone do Next.js e publica a porta `3000`. O back-end é executado separadamente em `../back-end`; defina `NEXT_PUBLIC_API_BASE_URL` com a URL acessível pelo navegador.

## Estrutura

- `app/`: rotas e layouts do Next.js.
- `components/`: componentes de interface e componentes por domínio.
- `hooks/`: hooks client-side e acesso a dados.
- `lib/`: cliente HTTP, tipos e utilitários.
- `public/`: arquivos estáticos.
