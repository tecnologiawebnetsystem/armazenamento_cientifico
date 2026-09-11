# SIGAC Front-end

Aplicação web do **SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico**. O front-end fornece a interface para autenticação, navegação, projetos, membros, permissões, arquivos, mapas, relatórios, auditoria e demais recursos do sistema.

## Visão geral do sistema

O SIGAC é uma aplicação corporativa organizada em duas partes independentes:

- **Front-end:** aplicação web responsável pela experiência do usuário, navegação, formulários, tabelas, filtros e consumo da API.
- **Back-end:** API responsável pela autenticação, regras de negócio, autorização, persistência e integrações.

Este diretório contém somente o front-end. Ele pode ser executado localmente ou empacotado em uma imagem Docker independente, sem depender de arquivos presentes na pasta `back-end` durante o build.

## Tecnologias

- Next.js 16 com App Router
- React e TypeScript
- Tailwind CSS
- shadcn/ui
- SWR para consultas e cache no cliente
- ESLint e TypeScript para validação estática
- Docker para empacotamento e execução

## Pré-requisitos

- Node.js 20 ou superior
- pnpm (versão definida no `package.json`) ou npm
- Docker Desktop e Docker Compose, caso opte pela execução em container
- Back-end SIGAC disponível em `http://localhost:8080` para o modo integrado

## Configuração de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

A principal configuração é:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Essa variável é pública e é incorporada ao código executado no navegador. Nunca coloque tokens, senhas ou segredos em variáveis com prefixo `NEXT_PUBLIC_`.

Se a variável não for definida, o front-end poderá utilizar as rotas locais configuradas para desenvolvimento, conforme o fluxo implementado no projeto.

## Execução local

Instale as dependências e inicie o servidor de desenvolvimento:

```bash
cd front-end
pnpm install
pnpm dev
```

Acesse:

- Aplicação: http://localhost:3000
- API utilizada pelo front-end: http://localhost:8080

Para executar em outra porta:

```bash
pnpm dev -- --port 3001
```

No Windows PowerShell:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:8080"
pnpm dev
```

## Build e execução de produção

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

A aplicação de produção ficará disponível em http://localhost:3000.

## Scripts disponíveis

```bash
pnpm dev        # inicia o servidor de desenvolvimento
pnpm typecheck  # valida os tipos TypeScript
pnpm lint       # executa o ESLint
pnpm build      # gera a build de produção
pnpm start      # inicia a build de produção
pnpm format     # formata os arquivos do projeto
pnpm test:e2e   # executa os testes end-to-end, quando configurados
```

## Execução com Docker

O front-end possui seu próprio `Dockerfile`, `docker-compose.yml` e `.dockerignore`. O contexto do build deve ser esta pasta, e não a raiz do repositório:

```bash
cd front-end
cp .env.example .env
# ajuste as variáveis necessárias

docker compose build
docker compose up -d
```

A aplicação ficará disponível em http://localhost:3000. Para acompanhar os logs:

```bash
docker compose logs -f front-end
```

Para parar os serviços:

```bash
docker compose down
```

O container utiliza o modo standalone do Next.js e executa com usuário não-root. O back-end deve estar acessível pela URL configurada em `NEXT_PUBLIC_API_BASE_URL`.

## Publicação no JFrog Artifactory

A publicação da imagem é independente da imagem do back-end. Configure no `.env`:

```dotenv
JFROG_REGISTRY=jfrog.petrobras.dev.br
JFROG_DOCKER_REPOSITORY=informar-repositorio-docker
IMAGE_TAG=local
JFROG_USER=seu-usuario
JFROG_TOKEN=seu-token
```

O host PyPI `jfrog.petrobras.dev.br/artifactory/api/pypi/.../simple` não é um registry Docker e não deve ser usado no nome da imagem.

```bash
printf '%s' "$JFROG_TOKEN" | docker login "$JFROG_REGISTRY" \
  --username "$JFROG_USER" --password-stdin

docker compose build
docker compose push
docker compose pull
docker compose up -d
```

A imagem segue o padrão:

```text
<JFROG_REGISTRY>/<JFROG_DOCKER_REPOSITORY>/armazenamento-cientifico-front-end:<IMAGE_TAG>
```

Nunca versione arquivos `.env` com credenciais reais.

## Integração com o back-end

O navegador precisa conseguir resolver a URL da API. Em desenvolvimento local, use:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Em ambientes corporativos, utilize a URL publicada do back-end e confirme que o CORS da API permite a origem do front-end.

## Estrutura de diretórios

- `app/`: rotas, layouts e páginas do Next.js.
- `components/`: componentes de interface e componentes organizados por domínio.
- `hooks/`: hooks client-side e consultas com SWR.
- `lib/`: cliente HTTP, tipos, autenticação e utilitários.
- `public/`: imagens, ícones e arquivos estáticos.
- `Dockerfile`: imagem independente do front-end.
- `docker-compose.yml`: execução local e publicação da imagem do front-end.

## Qualidade e troubleshooting

Antes de abrir um Pull Request:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Problemas comuns:

- **API indisponível:** confirme se o back-end está em execução na porta 8080.
- **CORS:** verifique `CORS_ORIGINS` no back-end.
- **Variável não aplicada:** reinicie o servidor após alterar `.env.local`.
- **Imagem não encontrada:** confirme o repositório Docker JFrog e execute `docker login`.
- **Dependências inconsistentes:** use `pnpm install --frozen-lockfile`.

## Separação para repositório próprio

Para criar o repositório corporativo do front-end, copie o conteúdo desta pasta como raiz do novo repositório. Mantenha juntos `package.json`, lockfile, `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.gitignore`, `.env.example`, `app`, `components`, `hooks`, `lib` e `public`.

O front-end não deve depender de arquivos fora desta pasta para instalar dependências, gerar a build ou executar o container.

## Segurança

- Não commite tokens, senhas ou arquivos `.env`.
- Não exponha segredos em variáveis `NEXT_PUBLIC_*`.
- Use HTTPS nas URLs de ambientes compartilhados.
- Publique imagens com tags imutáveis associadas ao commit ou versão da aplicação.
- Valide permissões no back-end; o front-end não é uma camada de segurança.

## Licença e uso corporativo

Este projeto é destinado ao uso corporativo da Petrobras e deve seguir as políticas internas de segurança, revisão de código, publicação de imagens e gestão de credenciais.
