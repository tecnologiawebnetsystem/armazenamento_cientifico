# Observabilidade mínima

## Logs estruturados

O backend FastAPI emite uma linha JSON por evento de aplicação. Cada registro contém `timestamp`, `level`, `logger`, `message` e o contexto disponível, incluindo `correlation_id` e `user_id` quando presentes.

O middleware aceita `X-Correlation-ID` recebido pelo cliente; quando ausente, gera um identificador UUID e o devolve no mesmo header da resposta. Não devem ser registrados tokens, senhas ou dados pessoais desnecessários.

## Auditoria

Eventos de negócio devem usar as ações catalogadas em `lib/types.ts`. Operações de projeto, alteração de membros, consulta de mapa, mudanças de permissão e exportações devem registrar usuário, entidade, resultado, projeto relacionado e correlation-id quando o contexto estiver disponível.

## Limitações atuais

A implementação Next atual mantém a trilha em memória para o protótipo. Para produção, a tabela de auditoria persistente deve ser o caminho oficial, com retenção, consulta paginada e controle de acesso por administrador/auditor.
