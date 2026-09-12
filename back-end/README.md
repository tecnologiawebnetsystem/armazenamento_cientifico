# SIGAC Back-end

API FastAPI do SIGAC, com documentação OpenAPI em `/docs` e `/redoc` quando `EXPOSE_API_DOCS=true`. O inventário completo dos endpoints é gerado pelo próprio app em `/openapi.json`.

## Instalação e validação

```bash
uv sync --dev
uv run ruff check app alembic scripts tests
uv run pytest -q
uv run alembic check
uv run uvicorn app.app:app --reload --port 8080
```

## Endpoints principais

- `/health` — disponibilidade da API.
- `/api/auth/*` — login, logout, sessão e CAV4.
- `/api/projects/*` — projetos e membros.
- `/api/files/*` — arquivos e compartilhamentos.
- `/api/dashboard/*` — indicadores.
- `/api/reports/*` — relatórios e exportações.
- `/api/permissions`, `/api/settings`, `/api/access-requests` — segurança.
- `/api/activity-logs/*` — auditoria.


API do **SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico**. O back-end concentra autenticação, autorização, regras de negócio, gerenciamento de projetos, membros, permissões, arquivos, relatórios, auditoria e persistência dos dados.

## O que é o SIGAC

O SIGAC é uma plataforma corporativa para controlar o acesso ao armazenamento de elementos científicos. O sistema centraliza projetos, arquivos, usuários, permissões e solicitações de acesso, garantindo que cada operação siga as regras de segurança e possa ser auditada.

### Regras principais do sistema

- A autorização é aplicada no servidor e considera o usuário, o projeto e o nível de acesso solicitado.
- Um usuário só pode consultar ou alterar projetos, membros e arquivos para os quais possui permissão.
- Solicitações de acesso devem passar pelo fluxo de análise antes da liberação.
- Alterações relevantes, acessos e eventos de segurança devem ser registrados em auditoria.
- O back-end é a fonte definitiva das regras de negócio; validações do front-end não substituem as validações da API.
- Segredos, tokens, credenciais e dados corporativos reais nunca devem ser versionados.

## Visão geral do sistema

O SIGAC é uma solução corporativa dividida em aplicação web e back-end independentes:


- **Front-end:** interface web acessada pelos usuários.
- **Back-end:** API HTTP responsável por validar requisições, aplicar regras de negócio, controlar acesso e salvar os dados.

Este diretório contém exclusivamente o serviço de API. Ele possui Dockerfile, Compose, configurações, migrations e documentação próprios para que possa ser levado a um repositório corporativo separado.

## Tecnologias

- Python 3.11 ou superior
- FastAPI
- Uvicorn
- SQLAlchemy com suporte assíncrono
- Alembic para migrations
- SQLite com `aiosqlite` no desenvolvimento atual
- PostgreSQL previsto para ambientes compartilhados e produção
- Pytest para testes automatizados
- Docker e Docker Compose

## Pré-requisitos

Para execução sem Docker:

- Python 3.11 ou superior
- pip ou uv
- Ambiente virtual recomendado

Para execução em container:

- Docker Desktop ou Docker Engine
- Docker Compose v2

## Banco de dados atual: SQLite

No momento, o banco padrão do projeto é o **SQLite**. Ele é adequado para desenvolvimento local, testes funcionais e demonstrações porque não exige a instalação ou manutenção de um servidor de banco separado.

Por padrão, o arquivo é criado em:

```text
back-end/data/sigac.db
```

A conexão é configurada no `.env`:

```dotenv
DATABASE_ENGINE=sqlite
DATABASE_URL=sqlite+aiosqlite:///./data/sigac.db
SEED_DATABASE=true
```

A pasta `data/` deve permanecer fora do controle de versão quando contiver dados locais. O banco SQLite não deve ser considerado a solução definitiva para produção, alta concorrência ou múltiplas réplicas da API. Em produção, o arquivo não deve ser compartilhado entre containers nem armazenado dentro da imagem Docker.

## Configuração de ambiente

Copie o arquivo de exemplo:

```bash
cd back-end
cp .env.example .env
```

Configuração mínima recomendada para desenvolvimento:

```dotenv
DATABASE_ENGINE=sqlite
DATABASE_URL=sqlite+aiosqlite:///./data/sigac.db
SEED_DATABASE=true
ENVIRONMENT=development
COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
PORT=8080
```

Não versionar `.env`, credenciais, tokens ou bancos com dados reais.

## Execução local sem Docker

Crie o ambiente do backend com `uv` (recomendado; evita o travamento do `ensurepip` observado no Windows/Python 3.14):

```bash
cd back-end
uv sync --dev
uv run uvicorn app.app:app --reload --port 8080
```

No Windows, use Python 3.11–3.13 para este projeto. Se precisar usar `venv`, abra o PowerShell como usuário normal e execute:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Se o `venv` continuar travando em `ensurepip`, instale/repare o Python pelo instalador oficial com **pip** e **Tcl/Tk** habilitados ou use `uv sync --dev`, que não depende do `ensurepip`.

Execute as migrations e inicie a API:

```bash
uv run alembic upgrade head
uv run uvicorn app.app:app --reload --host 0.0.0.0 --port 8080
```

Endpoints úteis:

- Health check: http://localhost:8080/health
- OpenAPI: http://localhost:8080/docs, quando habilitado
- ReDoc: http://localhost:8080/redoc, quando habilitado

## Execução com Docker Compose

O back-end possui Compose independente. Para iniciar a API com o SQLite local:

```bash
cd back-end
docker compose up --build
```

Para executar em segundo plano:

```bash
docker compose up --build -d
```

Para consultar logs:

```bash
docker compose logs -f back-end
```

Para parar a aplicação:

```bash
docker compose down
```

O diretório `data/` deve ser montado como volume para que o arquivo SQLite sobreviva à recriação do container. A imagem não deve conter dados de banco pré-populados nem segredos.

## Migrations com Alembic

As alterações estruturais do banco devem ser feitas por migrations versionadas:

```bash
alembic upgrade head
```

Comandos úteis:

```bash
alembic current
alembic history
alembic downgrade -1
```

Não altere tabelas manualmente em ambientes compartilhados sem criar a migration correspondente. Para SQLite, algumas alterações de schema podem exigir a estratégia de recriação de tabela suportada pelo Alembic.

## API e integração com o aplicação web

O aplicação web deve apontar para:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

A API deve permitir a origem do aplicação web em `CORS_ORIGINS`. Em ambiente publicado, substitua as origens locais por URLs explícitas e confiáveis; não use `*` quando houver autenticação ou cookies de sessão.

## Publicação no JFrog Artifactory

A imagem do back-end é publicada separadamente da imagem do aplicação web. Configure no `.env`:

```dotenv
JFROG_REGISTRY=jfrog.petrobras.dev.br
JFROG_DOCKER_REPOSITORY=informar-repositorio-docker
IMAGE_TAG=local
JFROG_USER=seu-usuario
JFROG_TOKEN=seu-token
```

O endereço `jfrog.petrobras.dev.br/artifactory/api/pypi/.../simple` é um repositório PyPI e não deve ser utilizado como endpoint ou nome de imagem Docker.

```bash
printf '%s' "$JFROG_TOKEN" | docker login "$JFROG_REGISTRY" \
  --username "$JFROG_USER" --password-stdin

docker compose build
docker compose push
docker compose pull
docker compose up -d
```

O nome esperado da imagem é:

```text
<JFROG_REGISTRY>/<JFROG_DOCKER_REPOSITORY>/armazenamento-cientifico-back-end:<IMAGE_TAG>
```

Use tags imutáveis em ambientes corporativos, preferencialmente relacionadas ao commit ou à versão liberada.

## Testes e validações

Com o ambiente virtual ativo:

```bash
pytest -q
python -m compileall app
```

Antes da publicação, confirme também:

```bash
alembic upgrade head
curl http://localhost:8080/health
```

## Arquitetura

O back-end utiliza uma arquitetura modular por domínio, evoluindo para **Clean Architecture** e **Hexagonal Architecture (Ports and Adapters)**. A aplicação mantém compatibilidade temporária com a API legada por meio de um adaptador isolado em `app/api/legacy.py`; novos recursos não devem adicionar lógica ao `legacy_api.py`.

### Camadas e padrões

- **API/Controllers:** HTTP, validação de entrada, dependências e serialização.
- **Application Services:** casos de uso e orquestração das transações.
- **Repositories:** persistência encapsulada atrás de interfaces estáveis.
- **Domain modules:** regras específicas de projetos, arquivos, auditoria e identidade.
- **Adapters:** SQLite/PostgreSQL, Entra ID, CAV4 e integrações externas.
- **Core:** configuração, segurança, autorização, logging e exceções.
- **Alembic:** única fonte versionada para evolução estrutural do banco.

O fluxo recomendado é:

```text
Route/Controller -> Application Service -> Repository -> SQLAlchemy -> Database
                                   -> Port -> External Adapter
```

### Regras de evolução

1. Rotas não acessam o banco diretamente.
2. Regras de negócio não ficam em controllers.
3. Integrações externas são acessadas por ports/adapters.
4. Toda alteração de banco exige migration Alembic.
5. A API legada somente recebe correções de compatibilidade até sua migração por domínio.
6. PostgreSQL é o banco-alvo de produção; SQLite fica restrito a desenvolvimento e testes rápidos.

> Estado atual: `ruff` e os testes passam. O `alembic check` ainda identifica tabelas legadas presentes no SQLite local que não fazem parte dos models atuais; isso deve ser resolvido por uma migration explícita de compatibilidade antes de remover qualquer tabela em ambiente compartilhado.

## Estrutura de diretórios

- `app/api/legacy.py`: boundary adapter temporário da API legada.
- `app/`: aplicação FastAPI, módulos, controllers, schemas, serviços e autenticação.
- `alembic/`: migrations versionadas.
- `database/`: schemas SQL e referências de dados.
- `data/`: banco SQLite local; não deve conter dados corporativos versionados.
- `scripts/`: scripts auxiliares de desenvolvimento e migração.
- `tests/`: testes automatizados.
- `Dockerfile`: imagem independente da API.
- `docker-compose.yml`: execução local e publicação da imagem.
- `.env.example`: referência das variáveis necessárias.

## Segurança

- Nunca versione `.env`, tokens, senhas ou dados reais do SQLite.
- Em produção, use PostgreSQL ou outro banco corporativo aprovado.
- Configure `COOKIE_SECURE=true` quando a aplicação estiver atrás de HTTPS.
- Restrinja `CORS_ORIGINS` às origens conhecidas.
- Desabilite a documentação OpenAPI pública em produção quando a política do ambiente exigir.
- Faça validação de entrada, autorização por usuário e controle de acesso no servidor.
- Execute o container com usuário não-root.
- Use imagens base atualizadas e faça varredura de vulnerabilidades antes da publicação.

## Migração futura de SQLite para PostgreSQL

A aplicação mantém `DATABASE_ENGINE` e `DATABASE_URL` configuráveis para permitir a evolução do ambiente local para um banco compartilhado. A migração deve incluir:

1. provisionamento do PostgreSQL conforme o padrão corporativo;
2. aplicação das migrations com `alembic upgrade head`;
3. exportação e transformação dos dados necessários do SQLite;
4. validação de chaves, índices, constraints e encoding;
5. testes de integração usando a URL do PostgreSQL;
6. desativação do seed automático em ambientes compartilhados;
7. atualização das variáveis secretas fora do repositório.

O SQLite permanece como opção de desenvolvimento até que o ambiente corporativo de banco esteja definido e validado.

## Separação para repositório próprio

Para criar o repositório corporativo do back-end, copie o conteúdo desta pasta como raiz do novo repositório. Mantenha juntos `app`, `alembic`, `database`, `scripts`, `tests`, `requirements.txt`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.gitignore`, `.env.example` e os arquivos de configuração necessários.

O back-end não deve depender de arquivos fora desta pasta para instalar dependências, executar migrations, gerar a imagem ou iniciar a API.

## Uso corporativo

Este projeto é destinado ao uso corporativo da Petrobras. A publicação do código, das imagens e das configurações deve seguir os processos internos de segurança, revisão, gestão de acessos, JFrog Artifactory e aprovação de mudanças.
