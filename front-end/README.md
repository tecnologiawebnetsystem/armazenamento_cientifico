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

## Docker e JFrog

O front-end possui imagem e Compose independentes do back-end. Copie `.env.example` para `.env` e informe o repositório Docker fornecido pela equipe JFrog:

```bash
cp .env.example .env
# edite JFROG_DOCKER_REPOSITORY e IMAGE_TAG

set -a; . ./.env; set +a
printf '%s' "$JFROG_TOKEN" | docker login "$JFROG_REGISTRY" --username "$JFROG_USER" --password-stdin
docker compose build
docker compose push
docker compose up -d
```

O Compose gera a imagem com o nome `${JFROG_REGISTRY}/${JFROG_DOCKER_REPOSITORY}/armazenamento-cientifico-front-end:${IMAGE_TAG}`. Para baixar uma versão publicada, use `docker compose pull` antes de `docker compose up -d`. A URL `jfrog.petrobras.dev.br/artifactory/api/pypi/.../simple` é exclusiva do PyPI e não deve ser usada no login ou nome de imagens Docker.

A imagem usa o modo standalone do Next.js e publica a porta `3000`. O back-end é executado separadamente em `../back-end`; defina `NEXT_PUBLIC_API_BASE_URL` com a URL acessível pelo navegador.

## Estrutura

- `app/`: rotas e layouts do Next.js.
- `components/`: componentes de interface e componentes por domínio.
- `hooks/`: hooks client-side e acesso a dados.
- `lib/`: cliente HTTP, tipos e utilitários.
- `public/`: arquivos estáticos.
