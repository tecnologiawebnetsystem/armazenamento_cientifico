# SIGAC — Modelo Entidade-Relacionamento e dicionário de dados

## Status da auditoria

A revisão `0011_bootstrap_orm_schema` é a migração canônica do ORM. O arquivo `backend/data/sigac.db` existente não está limpo: contém tabelas legadas em português e tabelas canônicas em inglês simultaneamente, além de uma tabela `menus` com colunas duplicadas (`modulo_id`/`module_id`, `nome`/`name` etc.). Portanto, o banco atual não deve ser tratado como fonte de verdade; ele precisa ser recriado ou migrado em ambiente controlado.

O schema PostgreSQL está mais completo que o schema SQLite versionado. Divergências relevantes: `users`, `projects`, `sessions`, `permission_matrix`, `project_access_groups`, `project_access_roles`, `last_viewed_at` e `notifications` existem no modelo/PostgreSQL, mas não estão representados de forma equivalente no SQLite canônico. A tabela `report_types` também aparece duplicada no SQLite como `tipos_relatorios` e `report_types`.

## Fontes de verdade

1. Modelos SQLAlchemy importados em `backend/app/modules/**/models.py` e `profile_model.py`.
2. Migrações Alembic, principalmente `0011_bootstrap_orm_schema.py`.
3. Schemas SQL reproduzíveis para cada dialeto.
4. Banco físico somente após executar todas as migrações e validar o head do Alembic.

## Convenções

- `PK`: chave primária; identifica unicamente uma linha.
- `FK`: chave estrangeira; referencia a PK ou chave candidata de outra tabela.
- `UK`: restrição de unicidade.
- `PK_FK`: coluna que participa da PK composta e também referencia outra tabela.
- `ON DELETE CASCADE`: remove dependentes quando o registro pai é removido.
- `ON DELETE RESTRICT`: impede remoção do pai enquanto houver dependentes.
- `ON DELETE SET NULL`: preserva o dependente, mas remove a referência.

## Dicionário de tabelas

### Identidade e autorização

- **profiles** — perfis funcionais do SIGAC. `id` PK; `name` UK; `description` descreve o perfil; `created_at` registra a criação.
- **users** — identidade local do usuário. `id` PK; `email` UK; `profile_id` FK para `profiles`; `role` guarda o papel operacional; `last_login_at` registra o último acesso.
- **modules** — módulos navegáveis do produto. `id` PK; `name` UK; `route` é a rota frontend; `display_order` ordena o menu; `active` habilita/desabilita.
- **permissions** — ações autorizáveis. `id` PK; `module_id` FK para `modules`; `name`, `description` e `active` definem a capacidade.
- **profile_permissions** — associação N:N entre perfis e permissões. PK composta `(profile_id, permission_id)`; `allowed` representa a decisão.
- **profile_modules** — associação N:N entre perfis e módulos. PK composta `(profile_id, module_id)`; `can_view` controla visibilidade.
- **menus** — itens de navegação. `id` PK; `module_id` FK opcional para `modules`; `parent_id` suporta hierarquia; `route`, `icon`, `display_order` e `active` controlam apresentação.
- **sessions** — sessões persistidas. `id` PK; `user_id` FK para `users`; `expires_at` controla expiração.
- **permission_matrix** — configuração agregada de compatibilidade. `id` PK; `matrix` contém a matriz estruturada em JSON/JSONB.

### Projetos, grupos e arquivos

- **projects** — unidade principal de trabalho científico. `id` PK; `code` UK; `managers_ids` e `participants_ids` são listas legadas; `status` e datas sustentam o ciclo de vida.
- **project_members** — membros diretos do projeto. PK composta `(project_id, user_id)`; ambas são FK; `role` define a participação.
- **groups** — grupos de acesso. `id` PK; `name` UK; `description` e `created_at` documentam o grupo.
- **user_groups** — associação N:N entre usuários e grupos. PK composta `(user_id, group_id)`; `source` identifica origem manual ou corporativa.
- **project_groups** — associação N:N entre projetos e grupos. PK composta `(project_id, group_id)`; `role` define o acesso do grupo.
- **project_access_groups** — regra de acesso baseada em grupo de provedor externo. `id` PK; `project_id` FK; `provider`, `group_name` e `access_level` definem a regra.
- **project_access_roles** — regra de acesso baseada em App Role/role externo. `id` PK; `project_id` FK; `provider`, `role_name` e `access_level` definem a regra.
- **files** — arquivos e pastas. `id` PK; `project_id` FK; `parent_id` FK autorreferente; `created_by` FK para `users`; `kind`, `name`, `size_bytes` e `mime_type` descrevem o objeto.
- **file_shares** — compartilhamento direto de arquivo com usuário. PK composta `(file_id, user_id)`; `access_level` define leitura/escrita.
- **file_permissions** — permissão por usuário ou grupo. `file_id` FK; `user_id` ou `group_id` deve ser preenchido; `access_level` e `inherited_from` sustentam herança.

### Fluxos, auditoria e relatórios

- **access_requests** — solicitação de acesso. `id` PK; `project_id` e `requester_id` FK; `analyzed_by` FK opcional; `status`, `requested_role`, `justification` e datas descrevem o fluxo.
- **notifications** — notificações por usuário. `id` PK; `user_id` FK; `read_at` diferencia pendente de lida.
- **activity_logs** — trilha de auditoria. `id` PK; `user_id` FK; `action`, `entity`, `entity_id`, `details` e `created_at` permitem rastreabilidade.
- **report_types** — tipos de relatório. `id` PK; `code` UK; `formats` define formatos permitidos; `active` controla disponibilidade.
- **report_fields** — campos configuráveis de relatório. `id` PK; `report_code` FK para `report_types.code`; `(report_code, field_key)` UK; `source_key` aponta para a origem dos dados.

## Recomendações de correção

1. Executar backup do SQLite atual.
2. Criar um banco SQLite novo a partir das migrações Alembic, em vez de tentar reutilizar as tabelas duplicadas.
3. Migrar dados após mapear explicitamente nomes legados em português para nomes canônicos em inglês.
4. Fazer o schema SQLite e PostgreSQL derivarem do mesmo `Base.metadata` ou validar ambos automaticamente em CI.
5. Adicionar uma verificação que falhe se existirem tabelas legadas duplicadas ou colunas incompatíveis.
6. Atualizar manualmente o documento ER e o PDF versionado sempre que houver alteração de modelo.
