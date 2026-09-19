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
- `/api/folders` — consulta somente leitura das pastas autorizadas pelo projeto.
- `/api/dashboard/*` — indicadores.
- `/api/reports/*` — relatórios e exportações.
- `/api/permissions`, `/api/settings` — segurança e configuração.
- `/api/activity-logs/*` — auditoria.


API do **SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico**. O back-end concentra autenticação, autorização, regras de negócio, gerenciamento de projetos, membros, permissões de projeto, consulta de arquivos, relatórios, auditoria e persistência dos dados.

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

## Tecnologias e versões

- **Python 3.11 ou superior** (`requires-python = ">=3.11"`; alvo do Ruff: `py311`).
- **FastAPI** `>=0.115,<1.0`.
- **Uvicorn** `>=0.30,<1.0`.
- **Pydantic** `>=2.8,<3.0` para validação e schemas.
- **SQLAlchemy** `>=2.0,<3.0` com suporte assíncrono.
- **Alembic** `>=1.16,<2.0` para migrations.
- **PostgreSQL/Aurora PostgreSQL** via `asyncpg` em todos os ambientes suportados.
- **Alembic** como única fonte de criação e alteração estrutural do schema.
- **Pytest** `>=8.3,<9.0` e `pytest-asyncio` para testes automatizados.
- Docker e Docker Compose.

As versões e faixas oficiais ficam registradas em `pyproject.toml` e devem ser atualizadas por ele, evitando divergência entre a documentação e o ambiente instalado.

## Arquitetura e padrões de projeto

O back-end utiliza uma arquitetura **modular por domínio**, em evolução para **Clean Architecture** e **Hexagonal Architecture (Ports and Adapters)**. O FastAPI funciona como camada de entrada HTTP, enquanto os casos de uso, regras de negócio e integrações permanecem separados para facilitar testes, manutenção e troca de infraestrutura.

Principais padrões utilizados:

- **Layered Architecture:** separação entre rotas/controllers, serviços de aplicação, domínio, persistência e infraestrutura.
- **Clean Architecture:** regras de negócio independentes de FastAPI, banco de dados e serviços externos.
- **Hexagonal Architecture:** integrações acessadas por portas/interfaces e implementadas por adapters.
- **Service Layer:** casos de uso e orquestração das transações ficam nos serviços, não nas rotas.
- **Repository Pattern:** acesso a PostgreSQL/Aurora encapsulado em repositories.
- **Dependency Injection:** dependências, sessão de banco e segurança fornecidas pelo sistema de dependências do FastAPI.
- **Schema/DTO Pattern:** Pydantic valida entradas e saídas da API sem expor diretamente os modelos de persistência.
- **Adapters:** CAV4 e integrações externas ficam isolados dos serviços de aplicação.

Fluxo padrão:

```text
Request -> Route/Controller -> Application Service -> Repository -> SQLAlchemy -> Database
                                      -> Port -> External Adapter
```

As rotas não devem acessar o banco diretamente, e toda alteração estrutural deve passar por uma migration do Alembic. O back-end é a fonte definitiva de autenticação, autorização e regras de negócio.

## Pré-requisitos

Para execução sem Docker:

- Python 3.11 ou superior
- pip ou uv
- Ambiente virtual recomendado

Para execução em container:

- Docker Desktop ou Docker Engine
- Docker Compose v2

## Banco de dados: PostgreSQL/Aurora

O único banco suportado é **PostgreSQL**, incluindo Amazon Aurora PostgreSQL. A API não cria schema no startup, não usa SQLite e não possui fallback local. O schema é criado e alterado exclusivamente pelo Alembic.

A conexão deve ser informada por `RDS_AURORA_POSTGRES_URL` ou pelo conjunto `RDS_AURORA_POSTGRES_HOST`, `RDS_AURORA_POSTGRES_USERNAME` e `RDS_AURORA_POSTGRES_PASSWORD`. Para Aurora com autenticação IAM, use a URL/credenciais injetadas pelo ambiente de execução e TLS obrigatório.

```dotenv
RDS_AURORA_POSTGRES_URL=postgresql+asyncpg://usuario:senha@host:5432/sigac
DB_MIN_SIZE=1
DB_MAX_SIZE=10
DB_COMMAND_TIMEOUT=30
```

Não versionar `.env`, credenciais, tokens ou dados reais. A conexão real só será validada quando o Aurora estiver configurado no ambiente.

## Configuração de ambiente

Copie o arquivo de exemplo:

```bash
cd back-end
cp .env.example .env
```

Configuração mínima recomendada para desenvolvimento conectado ao Aurora/PostgreSQL:

```dotenv
RDS_AURORA_POSTGRES_URL=postgresql+asyncpg://usuario:senha@localhost:5432/sigac
DB_MIN_SIZE=1
DB_MAX_SIZE=10
DB_COMMAND_TIMEOUT=30
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

O back-end possui Compose independente. Para iniciar a API apontando para o PostgreSQL/Aurora configurado no ambiente:

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

A imagem não deve conter dados de banco pré-populados nem segredos. O container deve receber a configuração PostgreSQL/Aurora por variáveis de ambiente.

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

Não altere tabelas manualmente em ambientes compartilhados sem criar a migration correspondente. O comando `alembic check` deve ser executado antes da publicação para detectar divergências entre o metadata ORM e as migrations.

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

O back-end utiliza uma arquitetura modular por domínio, com separação em camadas: controllers/rotas HTTP, services para regras de negócio e repositories para persistência. A API legada foi removida; novos recursos devem seguir esse fluxo.

### Camadas e padrões

- **API/Controllers:** HTTP, validação de entrada, dependências e serialização.
- **Application Services:** casos de uso e orquestração das transações.
- **Repositories:** persistência encapsulada atrás de interfaces estáveis.
- **Domain modules:** regras específicas de projetos, arquivos, auditoria e identidade.
- **Adapters:** PostgreSQL/Aurora, Entra ID, CAV4 e integrações externas.
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
5. PostgreSQL/Aurora é o único banco suportado.
6. Logs de conexão, Alembic e CAV4 nunca exibem segredos, tokens ou senhas.

> Estado atual: a conexão real e `alembic check` dependem de um Aurora PostgreSQL configurado no ambiente; sem essa configuração, a aplicação falha explicitamente em vez de usar armazenamento local.

## Estrutura de diretórios

- `app/`: aplicação FastAPI, módulos, controllers, services, repositories, schemas e autenticação.
- `alembic/`: migrations versionadas, única fonte estrutural do banco.
- `database/`: schemas SQL e referências de dados.
- `scripts/`: scripts auxiliares de desenvolvimento e migração.
- `tests/`: testes automatizados.
- `Dockerfile`: imagem independente da API.
- `docker-compose.yml`: execução local e publicação da imagem.
- `.env.example`: referência das variáveis necessárias.

## Segurança

- Nunca versione `.env`, tokens, senhas ou dados reais do banco.
- O único banco suportado pela aplicação é PostgreSQL/Aurora PostgreSQL.
- Configure `COOKIE_SECURE=true` quando a aplicação estiver atrás de HTTPS.
- Restrinja `CORS_ORIGINS` às origens conhecidas.
- Desabilite a documentação OpenAPI pública em produção quando a política do ambiente exigir.
- Faça validação de entrada, autorização por usuário e controle de acesso no servidor.
- Execute o container com usuário não-root.
- Use imagens base atualizadas e faça varredura de vulnerabilidades antes da publicação.

## Operação PostgreSQL/Aurora

A sequência de publicação é:

1. configurar as variáveis PostgreSQL/Aurora no ambiente;
2. executar `alembic upgrade head`;
3. validar `alembic check` e `python -m compileall app`;
4. iniciar a API e verificar `/health` e `/health/ready`;
5. confirmar nos logs apenas o host, banco, versão Alembic e resultado de `SELECT 1`, sem segredos.

Não há migração automática de SQLite. Dados existentes devem ser exportados e tratados por um procedimento controlado fora do startup da aplicação.

## Separação para repositório próprio

Para criar o repositório corporativo do back-end, copie o conteúdo desta pasta como raiz do novo repositório. Mantenha juntos `app`, `alembic`, `database`, `scripts`, `tests`, `requirements.txt`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.gitignore`, `.env.example` e os arquivos de configuração necessários.

O back-end não deve depender de arquivos fora desta pasta para instalar dependências, executar migrations, gerar a imagem ou iniciar a API.

## Uso corporativo

Este projeto é destinado ao uso corporativo da Petrobras. A publicação do código, das imagens e das configurações deve seguir os processos internos de segurança, revisão, gestão de acessos, JFrog Artifactory e aprovação de mudanças.
