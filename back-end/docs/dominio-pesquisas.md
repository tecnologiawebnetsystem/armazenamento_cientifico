# Domínio de Pesquisas

## Decisão

O SIGAC ainda não implementará o módulo `research` nesta etapa. A funcionalidade deve ser criada somente após aprovação do modelo de dados, responsáveis pelo domínio e regras de acesso.

## Fronteira proposta

- `researches`: pesquisa/projeto científico e seu ciclo de vida.
- `datasets`: conjuntos de dados associados à pesquisa.
- `publications`: resultados/publicações vinculados.
- `research_access`: solicitações e permissões específicas da pesquisa.

## Dependências

O domínio dependerá de `projects`, `users`, `files` e `authorization`, mas não deverá acessar seus controllers. A integração deverá ocorrer por services/ports bem definidos.

## Regras para a futura implementação

1. Definir owner e identificador da pesquisa.
2. Modelar estados e transições antes das rotas.
3. Definir permissões persistidas (`research.read`, `research.create`, `research.update`, `research.delete`).
4. Criar migrations reversíveis.
5. Criar `app/modules/research/` apenas junto com repository, service, schemas, controller e testes.
6. Não duplicar projetos nem usar campos genéricos para substituir tabelas de pesquisa.

## Fora de escopo

Nenhuma pasta ou módulo vazio será criado até que os requisitos e o modelo de dados sejam aprovados.
