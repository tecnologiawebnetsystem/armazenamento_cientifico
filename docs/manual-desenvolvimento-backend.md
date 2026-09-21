# Manual rápido de desenvolvimento — Back-end

## Arquitetura em resumo

O back-end utiliza uma arquitetura em camadas, organizada por domínio. Cada camada tem uma responsabilidade clara: a rota recebe a requisição HTTP, o service executa o caso de uso e as regras de negócio, o repository acessa o banco e o SQLAlchemy faz a persistência. Essa separação reduz acoplamento, facilita testes e permite alterar a forma de persistência sem espalhar detalhes do banco pela aplicação.

Em termos práticos, novas funcionalidades devem seguir o fluxo **Route/Controller → Service → Repository → Banco**, mantendo autenticação, autorização e regras de negócio no servidor.

## Estado atual

O back-end utiliza FastAPI, SQLAlchemy assíncrono, PostgreSQL/Aurora PostgreSQL, Pydantic, Alembic e uma arquitetura modular por domínio.

Fluxo obrigatório:

```text
Route/Controller -> Service -> Repository -> SQLAlchemy -> PostgreSQL/Aurora
                                      -> Adapter externo, quando necessário
```

O back-end é a autoridade de autenticação, autorização e regras de negócio. O frontend nunca substitui essas validações.

## Onde criar cada arquivo

```text
back-end/app/modules/<dominio>/
├── router.py          # endpoints HTTP
├── service.py         # casos de uso e regras de aplicação
├── repository.py      # consultas e persistência
├── models.py          # entidades SQLAlchemy do domínio
└── schemas.py         # entrada e saída Pydantic
```

Use os diretórios existentes do domínio quando já houver um módulo equivalente. Não crie arquivos diretamente na raiz de `app/` sem necessidade.

## Criando um novo endpoint

### 1. Schema Pydantic

Crie os contratos de entrada e saída em `schemas.py`:

```python
from pydantic import BaseModel, ConfigDict

class CreateExampleRequest(BaseModel):
    name: str

class ExampleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
```

Valide dados de entrada no schema. Nunca retorne diretamente uma entidade SQLAlchemy se isso expuser campos internos.

### 2. Model SQLAlchemy

Se houver persistência nova, adicione o model no módulo de domínio e registre-o no metadata usado pelo Alembic.

```python
class Example(Base):
    __tablename__ = "examples"
    # colunas e índices conforme o padrão existente
```

### 3. Migration

Toda alteração estrutural deve ter migration Alembic. Nunca altere o banco manualmente para uma mudança que precisa ser reproduzida em Homologação e Produção.

```bash
cd back-end
uv run alembic revision -m "add examples"
# editar a migration
uv run alembic upgrade head
```

A migration deve ser reversível quando possível, transacional e segura para dados existentes. Não use `create_all()` para alterar banco em runtime.

### 4. Repository

O repository concentra consultas e comandos de persistência. Ele recebe a sessão e não conhece HTTP.

```python
class ExampleRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, example_id: str):
        # consulta SQLAlchemy parametrizada
        ...
```

Sempre aplique escopo de usuário, projeto ou tenant quando a tabela for protegida.

### 5. Service

O service contém o caso de uso, valida autorização de negócio, chama repositories e coordena transação.

```python
class ExampleService:
    def __init__(self, repository: ExampleRepository):
        self.repository = repository

    async def create(self, user, data: CreateExampleRequest):
        # regras de negócio e autorização
        return await self.repository.create(user.id, data)
```

Não coloque regra de negócio complexa no router.

### 6. Router/controller

O router converte HTTP em chamada de service e define status codes, dependências e autenticação.

```python
@router.post("", response_model=ExampleResponse, status_code=201)
async def create_example(payload: CreateExampleRequest, current_user=Depends(get_current_user)):
    return await service.create(current_user, payload)
```

O router não deve montar SQL, acessar `session.execute()` diretamente ou decidir permissões sozinho.

### 7. Registrar o router

Inclua o router no agregador principal da API, seguindo o padrão dos módulos existentes. Verifique se o prefixo, tags e dependências de autenticação estão corretos.

## Autorização

- `401`: sessão ausente ou expirada.
- `403`: usuário autenticado sem capability.
- O frontend pode ocultar ações, mas o backend deve bloquear a operação.
- Use as permissões parametrizadas existentes; não crie roles hardcoded no código.
- Registre operações administrativas e alterações relevantes em `activity_logs`.

## Banco e configuração

Localmente, use `.env` não versionado. Em AWS/Aurora, use variáveis injetadas pelo ambiente:

```text
RDS_AURORA_POSTGRES_URL
ou
RDS_AURORA_POSTGRES_HOST
RDS_AURORA_POSTGRES_USERNAME
RDS_AURORA_POSTGRES_PASSWORD
RDS_AURORA_POSTGRES_DATABASE
```

Não faça log de URLs, senhas, tokens ou cookies.

## Seed e parametrização

Seeds de catálogo/permissão devem ser idempotentes. Use `ON CONFLICT` ou equivalente e mantenha a parametrização separada de dados transacionais.

Não crie registros fictícios permanentes em:

- `sessions`;
- `activity_logs`;
- `access_requests`.

## Testes e validação

Antes de abrir PR:

```bash
cd back-end
uv run ruff check app alembic scripts tests
uv run pytest -q
uv run alembic check
uv run python -m compileall -q app
```

Teste pelo menos: sucesso, validação inválida, `401`, `403`, registro inexistente e isolamento entre usuários/projetos.

## Checklist rápido

- [ ] Existe schema Pydantic para entrada e saída.
- [ ] Regra de negócio está no service.
- [ ] Banco é acessado pelo repository.
- [ ] Existe migration Alembic se o schema mudou.
- [ ] Endpoint exige autenticação quando necessário.
- [ ] Capability é validada no backend.
- [ ] Queries respeitam escopo e não expõem dados de outro usuário.
- [ ] Testes, Ruff e `alembic check` passaram.
- [ ] Nenhum segredo foi versionado.

## Regra principal

Se a mudança altera negócio, autorização ou dados, ela pertence ao back-end. O frontend apenas solicita a operação e apresenta o resultado da API.
