# Backend FastAPI

API Python compatível com o frontend atual do Armazenamento Científico. O frontend continua usando os paths `/api/...`; quando `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` é configurado, essas chamadas são atendidas por este serviço.

## Requisitos

- Python 3.11+
- pip

## Instalação e execução

Linux/macOS:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e .
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\\Scripts\\Activate.ps1
python -m pip install --upgrade pip
pip install -e .
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- OpenAPI: `http://localhost:8000/openapi.json`
- Saúde: `http://localhost:8000/health`

## Conectar ao frontend

Com o backend ativo, execute na raiz, em outro terminal:

```bash
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

No Windows PowerShell:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
npm run dev
```

## Endpoints implementados

- `POST/GET /api/auth/login`, `/api/auth/logout`, `/api/auth/session`
- `GET/POST /api/projects`
- `GET/PATCH/DELETE /api/projects/{project_id}`
- `GET /api/projects/{project_id}/members`
- `GET/POST/PATCH/DELETE /api/files` e `/api/files/{file_id}`
- `POST /api/files/{file_id}/share`
- `GET /api/reports`
- `GET /api/access-map`
- `GET /api/activity-logs` e `/api/activity-logs/export?format=csv|txt`
- `GET /api/users` e `PATCH /api/users/{user_id}`

Os payloads completos estão em `../docs/api-endpoints.md`.

## Desenvolvimento

Usuários de demonstração:

- `admin@exemplo.com` / `admin123`
- `gerente@exemplo.com` / `gerente123`
- `patrocinador@exemplo.com` / `patrocinador123`
- `auditor@exemplo.com` / `auditor123`

Também é possível enviar `x-user-id` para testar um usuário. Os dados são armazenados em memória e são recriados ao reiniciar o processo.

## Verificação

```bash
python -m compileall -q .
python -c "from main import app; print(app.title)"
```

## Próximos passos para produção

Trocar os dicionários em memória por PostgreSQL, armazenar senhas com hash, usar sessões assinadas/rotacionáveis, limitar CORS a domínios conhecidos, adicionar migrações, paginação nos logs e testes automatizados de autorização. O login atual é exclusivamente demonstrativo e não deve ser usado em produção.
