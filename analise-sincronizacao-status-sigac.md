# Análise — Sincronização do status do chamado no SIGAC

## 1. Objetivo

Realizei a análise dos endpoints disponibilizados para definir a melhor estratégia de sincronização do status dos chamados entre o sistema de origem e o SIGAC/ServiceNow.

O objetivo é que, sempre que o status de um chamado for alterado no sistema de origem, o SIGAC receba a alteração de forma controlada, rastreável e compatível com o tipo do chamado.

Esta análise deverá ser validada com os responsáveis pelo processo antes da implementação definitiva, principalmente quanto ao catálogo de status do sistema de origem, aos motivos de pendência/cancelamento e aos campos obrigatórios de resolução.

## 2. Endpoints analisados

Foram identificados os seguintes grupos de endpoints:

- atualização de registro do chamado por `IdChamado` ou `RefChamado`;
- atualização de status do chamado por `IdChamado` ou `RefChamado`;
- consulta de chamado por ID, número ou lista de chamados;
- consulta de atividades do chamado;
- criação de anotações;
- designação de chamado;
- criação de chamado, relacionamentos, mudanças padrão, e-mail e anexos.

Para a atividade de sincronização de status, os endpoints de criação, consulta de atividades, designação e anexos não devem ser utilizados como operação principal. Eles podem ser usados como apoio, auditoria ou complemento do processo.

## 3. Endpoint recomendado

### Endpoint principal recomendado

**PUT — Atualizar status chamado RefChamado**

```text
PUT /ti/itsm/v1/itsm-chamados/chamados/ref/{RefChamado}/status
```

### Justificativa

Recomendo o endpoint por `RefChamado` porque o número do chamado é o identificador normalmente conhecido pelos usuários e pelos processos de negócio, por exemplo `INC0012345`, `RITM0012345` ou `CHG0012345`.

O endpoint por referência reduz a necessidade de uma consulta prévia para descobrir o ID interno do registro. Isso diminui chamadas, reduz pontos de falha e facilita a rastreabilidade nos logs e chamados de suporte.

O endpoint por `IdChamado` deve ser utilizado como alternativa quando o sistema de origem já possuir o identificador interno do SIGAC ou quando uma integração anterior tiver armazenado esse ID com segurança.

### Endpoint alternativo

```text
PUT /ti/itsm/v1/itsm-chamados/chamados/{IdChamado}/status
```

A operação é funcionalmente equivalente, mas depende de um identificador técnico do banco. Não recomendo utilizá-la como primeira opção para uma integração orientada ao processo, pois o ID pode não estar disponível ou pode exigir uma consulta adicional.

## 4. Endpoint de atualização de registro

Os endpoints abaixo não devem substituir o endpoint de status:

```text
PUT /ti/itsm/v1/itsm-chamados/chamados/ref/{RefChamado}
PUT /ti/itsm/v1/itsm-chamados/chamados/{IdChamado}
```

Eles são destinados à atualização de campos do chamado, como descrição, descrição detalhada, item de configuração, impacto, urgência, sintoma, notas de resolução e campos de formulário.

Podem ser usados em uma etapa complementar, quando a alteração de status exigir dados adicionais, por exemplo:

- preenchimento de descrição de resolução;
- atualização de impacto ou urgência;
- preenchimento de campos do formulário;
- inclusão de uma nota técnica;
- atualização do item de configuração.

A regra recomendada é não misturar atualização de dados cadastrais com mudança de status sem necessidade. Cada operação deve ser registrada separadamente para facilitar reprocessamento e análise de erro.

## 5. Fluxo proposto de sincronização

### 5.1 Fluxo normal

1. Identificar o chamado pela referência `RefChamado`.
2. Ler o status atual no sistema de origem.
3. Identificar o tipo do chamado: `INC`, `INCTASK`, `RITM`, `SCTASK`, `PRB`, `PRBTASK`, `CHG`, `CGHTASK` ou `CMDBTASK`.
4. Consultar o chamado no SIGAC quando não houver certeza de que ele existe ou quando for necessário comparar o status atual.
5. Consultar a tabela de mapeamento do status de origem para o status aceito pelo SIGAC.
6. Verificar se a alteração realmente representa mudança de status. Se o status já for igual, não enviar uma nova atualização.
7. Montar o corpo da requisição somente com os campos aplicáveis.
8. Enviar `PUT /chamados/ref/{RefChamado}/status`.
9. Registrar request, resposta, status anterior, status novo, data, usuário/processo e identificador de correlação.
10. Confirmar o resultado pelo código HTTP e, quando necessário, por nova consulta ao chamado.
11. Em caso de falha transitória, reprocessar de forma controlada, sem duplicar eventos.

### 5.2 Idempotência

A integração deve evitar o envio repetido da mesma alteração. Para isso, deve armazenar ou calcular uma chave de idempotência composta por:

- número do chamado;
- tipo do chamado;
- status de destino;
- motivo de status;
- versão ou data da alteração na origem.

Antes de enviar, deve ser verificado se a mesma transição já foi processada com sucesso. O endpoint retorna um ID de registro criado, que deve ser armazenado para auditoria.

## 6. Mapeamento de status

Os status abaixo representam o mapeamento conceitual inicial. Os nomes exatos do sistema de origem ainda precisam ser confirmados com os responsáveis pelo processo.

| Status de negócio na origem | Status no SIGAC | Observação |
|---|---|---|
| Novo / Aberto | Novo ou estado inicial do tipo | Validar se o SIGAC permite alteração para o estado inicial pelo endpoint de status. |
| Em andamento | `In Progress`, `Work in Progress` ou equivalente do tipo | O valor aceito varia por tipo de chamado. |
| Pendente | `Pending` ou `On Hold` | Exige `motivo_status` para INC, RITM e SCTASK. |
| Resolvido | `Resolved` ou equivalente | Exige campos adicionais conforme o tipo. |
| Encerrado completo | `Closed Complete` ou `Closed` | Deve respeitar o ciclo de vida do tipo. |
| Encerrado incompleto | `Closed Incomplete` ou `Incomplete` | Aplicável principalmente a SCTASK e INCTASK. |
| Cancelado | `Canceled` ou equivalente | Exige motivo de cancelamento e, em alguns tipos, justificativa. |
| Avaliação | `Assess` | Aplicável a PRB e PRBTASK. |
| Análise de causa raiz | `Root Cause Analysis` | Aplicável a PRB. |
| Correção em andamento | `Fix In Progress` | Aplicável a PRB. |
| Implementação | `Implement` ou `In Progress` | Aplicável a CHG. |

### 6.1 Valores por tipo de chamado

| Tipo | Status relevantes documentados no endpoint |
|---|---|
| `RITM` | Cancelado; confirmar estados disponíveis para o ciclo completo. |
| `SCTASK` | Em andamento, pendente, cancelado, resolvido, encerrada completa e encerrada incompleta. |
| `INC` | Em andamento, pendente/on hold, cancelado e resolvido. |
| `INCTASK` | Em andamento, pendente/on hold, cancelado, resolvido, fechado completo e fechado incompleto. |
| `PRB` | Avaliar, análise de causa raiz, correção em andamento e resolvido. |
| `PRBTASK` | Avaliar, trabalho em andamento e resolvido/encerrado. |
| `CHG` | Implementar/em andamento, cancelado e resolvido/encerrado. |
| `CGHTASK` | Cancelado e resolvido/encerrado. |
| `CMDBTASK` | Trabalho em andamento, resolvido/encerrado concluído e encerrado cancelado. |

Os valores devem ser enviados exatamente conforme aceitos pelo SIGAC. Apesar de a documentação apresentar traduções em português e inglês, a integração deve adotar uma convenção única e testada. Recomendo padronizar internamente para um código de negócio e converter para o valor aceito pelo endpoint em uma camada de mapeamento.

## 7. Regras de atualização

### 7.1 Campos obrigatórios por situação

- `status`: obrigatório em todas as chamadas.
- `motivo_status`: obrigatório para INC, RITM e SCTASK quando o status for de pendência.
- `notas`: obrigatório para INC e INCTASK em qualquer alteração de status.
- `conhecimento`: opcional para INC resolvido.
- `possivel_fcr`: opcional para INC resolvido.
- `categoria_causa`: obrigatório para INC resolvido.
- `subcategoria_causa`: obrigatório para INC resolvido.
- `codigo_resolucao`: obrigatório para INC, CHG e CGHTASK resolvidos.
- `descricao_resolucao`: obrigatório para INC, CHG e CGHTASK resolvidos.
- `motivo_cancelamento`: obrigatório para INC, RITM e SCTASK cancelados.
- `justificativa_cancelamento`: obrigatório para RITM e SCTASK cancelados.
- `horario_agendamento`: obrigatório quando a pendência for agendada.
- `fornecedor`: obrigatório para INC pendente aguardando fornecedor.
- `notas_causa` e `notas_correcao`: obrigatórios para PRB resolvido.

### 7.2 Validações antes do envio

A origem deve validar o payload antes de chamar o SIGAC. Recomendo validar:

- existência do chamado;
- tipo do chamado;
- status permitido para o tipo;
- motivo de status permitido para o status;
- preenchimento dos campos obrigatórios;
- chamado ainda não encerrado;
- transição permitida pelo processo;
- tamanho e formato dos textos;
- ausência de valores incompatíveis com o tipo do chamado.

## 8. Tratamento de inconsistências

| Situação | Tratamento recomendado |
|---|---|
| Chamado não encontrado | Marcar como erro funcional, não repetir automaticamente sem corrigir a referência. |
| Status não permitido para o tipo | Marcar como erro de mapeamento e encaminhar para análise do responsável. |
| Motivo de status inválido | Corrigir o mapeamento ou cadastro da origem; não repetir indefinidamente. |
| Campo obrigatório ausente | Manter pendência de sincronização e solicitar os dados faltantes. |
| Chamado já encerrado | Não alterar automaticamente; exigir avaliação de exceção pelo processo. |
| Erro 400 | Corrigir payload, status, motivo ou valor de formulário. Retry automático não deve ser aplicado sem análise. |
| Erro 404 | Validar número do chamado e existência no SIGAC. |
| Erro 406 | Bloquear novas tentativas automáticas para o mesmo evento. |
| Erro 500 | Tentar novamente com backoff; após o limite, abrir ocorrência técnica. |
| Timeout ou indisponibilidade | Reprocessar com fila e backoff, preservando o evento original. |
| Resposta sem confirmação | Consultar o chamado antes de reenviar para evitar duplicidade. |

## 9. Códigos de resposta esperados

### Sucesso

**HTTP 201 — Created**

Indica que o status foi alterado. A resposta contém uma mensagem e um ID do registro criado. Esse ID deve ser armazenado no histórico de sincronização.

### Erros funcionais

- **HTTP 400 — Bad Request:** status, motivo ou valor de campo inválido.
- **HTTP 404 — Not Found:** chamado não localizado.
- **HTTP 406 — Not Acceptable:** chamado encerrado ou operação não permitida.

### Erro técnico

- **HTTP 500 — Internal Server Error:** erro no ServiceNow/SIGAC ou na integração. Deve ser registrado com request, response, timestamp e correlação.

## 10. Impacto nos processos existentes

A sincronização pode impactar os seguintes processos:

- encerramento e resolução de chamados;
- notificações automáticas disparadas pelo SIGAC;
- cálculo de SLA e tempos de atendimento;
- filas e responsabilidades das equipes;
- abertura ou fechamento de tarefas filhas;
- relatórios de chamados e indicadores;
- auditoria e histórico de alterações;
- processos que dependem de notas de resolução ou motivos de pendência.

Recomendo que a sincronização não sobrescreva alterações feitas diretamente no SIGAC sem uma regra de prioridade definida. Também deve ser definido se a origem é o sistema mestre do status ou se o SIGAC pode alterar o status de volta para a origem.

## 11. Cenários de sucesso

### Sucesso simples

O sistema de origem altera um INC para “Em andamento”. O integrador converte para `In Progress`, envia o endpoint por `RefChamado`, recebe HTTP 201, armazena o ID retornado e marca o evento como sincronizado.

### Sucesso com pendência

O chamado é colocado em pendência. Além do status `Pending`, o integrador envia `motivo_status`, por exemplo `Awaiting Caller`, e os demais campos obrigatórios. O SIGAC aceita a transição e o evento é concluído.

### Sucesso com resolução

O chamado é resolvido. O integrador valida notas, categoria de causa, subcategoria, código de resolução e descrição de resolução conforme o tipo. Somente após a validação o endpoint é chamado.

### Reprocessamento idempotente

Uma resposta é perdida após o envio. Antes de reenviar, o integrador consulta o chamado ou verifica o histórico do evento. Se o status já estiver atualizado, marca o evento como concluído sem duplicar a operação.

## 12. Cenários de falha

### Status sem mapeamento

A origem envia um status que não possui equivalente aprovado no SIGAC. A sincronização deve ser rejeitada localmente, com erro de configuração, sem chamada ao endpoint.

### Campos insuficientes

A origem envia “Resolvido” para um INC sem categoria de causa, código de resolução ou descrição. O integrador deve impedir o envio e manter o evento pendente de complemento.

### Chamado inexistente

O número informado não é localizado no SIGAC. O erro deve ser registrado como funcional e encaminhado para correção do identificador.

### Chamado já encerrado

O endpoint retorna HTTP 406. O evento não deve entrar em retry automático, pois a alteração pode violar o ciclo de vida do chamado.

### Indisponibilidade do SIGAC

O endpoint retorna HTTP 500, timeout ou erro de conexão. O evento deve permanecer em fila, com tentativas limitadas, backoff e alerta após o limite.

### Divergência entre sistemas

O SIGAC possui um status diferente do sistema de origem. Deve ser feita uma consulta de confirmação e aplicada a regra de sistema mestre antes de alterar qualquer dado.

## 13. Auditoria e monitoramento

Cada tentativa deve registrar:

- número do chamado;
- ID interno, quando disponível;
- tipo do chamado;
- status anterior na origem;
- status de destino no SIGAC;
- motivo de status;
- payload enviado, com proteção de dados sensíveis;
- endpoint utilizado;
- data e hora;
- usuário ou processo responsável;
- código HTTP;
- mensagem e detalhe retornados;
- ID retornado pelo SIGAC;
- número da tentativa;
- resultado final;
- data do próximo retry, quando aplicável.

Recomendo um painel ou relatório com os estados `Pendente`, `Processando`, `Sincronizado`, `Erro funcional`, `Erro técnico` e `Descartado após limite de tentativas`.

## 14. Decisão técnica

Minha recomendação é utilizar o endpoint:

```text
PUT /ti/itsm/v1/itsm-chamados/chamados/ref/{RefChamado}/status
```

O endpoint por `IdChamado` deve permanecer como alternativa técnica quando o ID interno já estiver disponível. A atualização de registro deve ser chamada separadamente somente quando o status exigir dados complementares.

A implementação deve utilizar uma camada de mapeamento por tipo de chamado, validação prévia, controle de idempotência, retry apenas para erros técnicos e auditoria completa de cada tentativa.

## 15. Pendências para validação com os responsáveis

Antes de concluir a implementação, preciso validar:

1. Quais são exatamente os status existentes no sistema de origem?
2. Qual sistema é o mestre do status: origem, SIGAC ou regra híbrida?
3. Quais transições são permitidas para cada tipo de chamado?
4. Quais campos da origem alimentam categoria, subcategoria, resolução e motivo de cancelamento?
5. Quais valores oficiais devem ser usados para `motivo_status`?
6. Como tratar alterações feitas manualmente no SIGAC?
7. Qual o limite de tentativas e o prazo de reprocessamento?
8. Quem será responsável por tratar erros funcionais e técnicos?
9. O processo deve atualizar apenas chamados existentes ou também criar chamados ausentes?
10. A operação deve ser síncrona ou processada por fila?

## 16. Conclusão

Após analisar os endpoints, concluo que a opção mais adequada para sincronizar o status é o `PUT` de atualização de status por `RefChamado`. Ele representa melhor o processo de negócio, utiliza o número conhecido do chamado e evita uma consulta adicional para obter o ID interno.

A solução não deve enviar apenas o status. Ela deve aplicar regras por tipo de chamado, incluir os campos obrigatórios de pendência, resolução e cancelamento, tratar respostas 400, 404, 406 e 500 de forma diferente e manter histórico completo das tentativas.

Esta análise deve ser apresentada aos responsáveis pelo processo para validação do mapeamento de status, das transições permitidas, da definição do sistema mestre e dos critérios de retry antes do início do desenvolvimento.
