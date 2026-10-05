# Histórias de Usuário — Mapa de Acessos e Auditoria

## Objetivo

Disponibilizar a consulta do mapa de acessos por projeto, com integração ao API de Identidade, regras de autorização por perfil, trilha de auditoria e avaliação da criação de projetos via ServiceNow.

> **Premissa de estimativa:** os pontos seguem a escala Fibonacci utilizada no projeto: 1, 2, 3, 5, 8 e 13.

---

## História 1 — Definir estratégia de consulta ao API Identidade

### Título:
Definir a estratégia de integração com o API Identidade.

### Descrição:
Como equipe de desenvolvimento, quero definir e registrar a estratégia técnica para consultar grupos e membros no API Identidade, para garantir que a implementação do mapa de acessos utilize autenticação, permissões, endpoints e padrões de integração aprovados.

A definição deve considerar o alinhamento com Paulo Baceiredo, responsável técnico pelo Identidade, além dos requisitos de infraestrutura, segurança, limites de consumo, paginação e tratamento de indisponibilidade.

### Critérios de Aceite:
- [ ] A decisão técnica da integração está registrada no repositório ou na documentação oficial do projeto.
- [ ] Os endpoints, métodos HTTP, contratos de resposta e identificadores necessários estão documentados.
- [ ] O fluxo de autenticação e as permissões exigidas estão definidos.
- [ ] Os pré-requisitos de infraestrutura, incluindo app registration, client ID, secrets/certificados e permissões, estão listados.
- [ ] As regras de paginação, timeout, retry e tratamento de erros estão definidas.
- [ ] O alinhamento com Paulo Baceiredo ou com o time responsável pelo Identidade está registrado.

### Pontos:
**3 pontos**

---

## História 2 — Serviço de consulta de membros de grupos por projeto

### Título:
Consultar membros de grupos associados a um projeto.

### Descrição:
Como serviço do SIGAC, quero consultar os membros de um grupo no API Identidade a partir do identificador do grupo, para obter os usuários que possuem acesso a um projeto.

O serviço deve encapsular a integração externa, normalizar os dados retornados e proteger a aplicação contra falhas de comunicação, respostas inválidas e grandes volumes de membros.

### Critérios de Aceite:
- [ ] Dado um identificador de grupo válido, o serviço retorna os membros associados.
- [ ] A consulta trata paginação até obter todos os membros ou atingir o limite configurado.
- [ ] Os dados retornados são normalizados para o contrato interno da aplicação.
- [ ] Grupo inexistente ou sem membros retorna resposta tratável e não causa erro inesperado.
- [ ] Timeouts, indisponibilidade e erros do API Identidade são tratados e registrados em log.
- [ ] Tokens, client secrets e demais credenciais não são expostos ao front-end nem registrados em log.
- [ ] Existem testes para sucesso, paginação, grupo inexistente, timeout e erro de autenticação.

### Pontos:
**5 pontos**

---

## História 3 — Contrato e modelo interno do mapa de acessos

### Título:
Definir o modelo interno para grupos, membros e origem dos dados.

### Descrição:
Como equipe de desenvolvimento, quero padronizar o modelo de dados do mapa de acessos, para que as informações provenientes do API Identidade sejam utilizadas de forma consistente pela API, pelas telas e pelos relatórios.

O modelo deve representar projeto, grupos, membros, perfil ou tipo de acesso quando disponível, origem da informação, data da consulta e situação da sincronização.

### Critérios de Aceite:
- [ ] O contrato interno define projeto, grupos, membros e seus identificadores.
- [ ] O modelo contempla nome, identificador e demais atributos necessários para exibição.
- [ ] O contrato informa a fonte dos dados e o timestamp da consulta.
- [ ] Campos obrigatórios, opcionais e regras de validação estão documentados.
- [ ] O modelo trata respostas vazias sem quebrar a tela ou a API.
- [ ] O contrato possui exemplos de resposta para sucesso, ausência de dados e erro.

### Pontos:
**3 pontos**

---

## História 4 — Endpoint do mapa de acessos por projeto

### Título:
Disponibilizar o endpoint do mapa de acessos por projeto.

### Descrição:
Como usuário autorizado, quero consultar o mapa de acessos de um projeto, para visualizar os grupos e respectivos membros que possuem acesso ao projeto.

O endpoint deve consolidar as informações do projeto e do API Identidade, respeitando as regras de autorização definidas para cada perfil.

### Critérios de Aceite:
- [ ] O endpoint `GET /projects/{id}/access-map` está disponível e documentado.
- [ ] A resposta contém o projeto, seus grupos e os respectivos membros.
- [ ] A resposta inclui a fonte dos dados e o timestamp da consulta.
- [ ] Projeto inexistente retorna HTTP 404.
- [ ] Usuário sem permissão retorna HTTP 403 e não recebe dados do projeto.
- [ ] Falhas no API Identidade são retornadas com erro controlado e rastreável.
- [ ] O endpoint possui testes de sucesso, 404, 403 e falha de integração.

### Pontos:
**5 pontos**

---

## História 5 — Consultar histórico de logs de auditoria

### Título:
Consultar o histórico de logs de auditoria.

### Descrição:
Como auditor ou administrador, quero consultar o histórico de eventos de auditoria, para rastrear operações realizadas no sistema e investigar alterações ou acessos relevantes.

A consulta deve permitir filtros por período, usuário, operação, recurso, projeto e resultado, respeitando as permissões do solicitante.

### Critérios de Aceite:
- [ ] Usuário autorizado consegue consultar os logs de auditoria.
- [ ] A consulta permite filtrar por período inicial e final.
- [ ] É possível filtrar por usuário, operação, recurso, projeto e resultado.
- [ ] Os resultados são paginados e possuem ordenação consistente por data.
- [ ] Cada registro apresenta data/hora, usuário, operação, recurso, identificador, resultado e origem.
- [ ] Usuário sem permissão recebe HTTP 403.
- [ ] A consulta não permite acesso a dados fora do escopo autorizado.

### Pontos:
**5 pontos**

---

## História 6 — Registrar operações dos usuários em log

### Título:
Registrar operações relevantes dos usuários em trilha de auditoria.

### Descrição:
Como administrador de segurança, quero que as operações relevantes dos usuários sejam registradas automaticamente, para garantir rastreabilidade e apoiar auditorias e investigações.

Devem ser registradas, no mínimo, autenticação, logout, consultas ao mapa de acessos, tentativas negadas, alterações de permissões e operações administrativas.

### Critérios de Aceite:
- [ ] Operações relevantes são registradas automaticamente no back-end.
- [ ] O registro contém usuário, data/hora, operação, recurso, identificador, resultado e origem da requisição.
- [ ] Tentativas autorizadas e negadas são diferenciadas.
- [ ] Falhas ao registrar auditoria não expõem dados sensíveis nem interrompem indevidamente a operação principal, conforme política definida.
- [ ] Tokens, senhas e segredos nunca são gravados nos logs.
- [ ] Existem testes para operações permitidas, negadas e falhas de persistência.

### Pontos:
**3 pontos**

---

## História 7 — Configurar permissões de acesso aos logs de auditoria

### Título:
Configurar permissões de acesso aos logs de auditoria.

### Descrição:
Como administrador do sistema, quero configurar quais perfis podem consultar e exportar logs de auditoria, para proteger informações sensíveis e aplicar segregação de responsabilidades.

A regra deve ser armazenada na fonte oficial de permissões do sistema e aplicada no back-end, independentemente da interface.

### Critérios de Aceite:
- [ ] As permissões de consulta e exportação de logs estão cadastradas.
- [ ] Administrador e Auditor possuem apenas os acessos definidos pela matriz de permissões aprovada.
- [ ] Usuários sem a permissão necessária recebem HTTP 403.
- [ ] A verificação de permissão ocorre no back-end.
- [ ] Alterações de permissões são auditadas.
- [ ] As variáveis de ambiente AWS necessárias para conexão/configuração são definidas por ambiente, sem secrets versionados.
- [ ] A configuração funciona em DEV, HMG e PROD com valores independentes.

### Pontos:
**3 pontos**

---

## História 8 — Regra: Administrador

### Título:
Permitir acesso do perfil Administrador conforme a regra de segurança definida.

### Descrição:
Como Administrador, quero acessar as funcionalidades e informações permitidas pelo meu perfil, para executar atividades administrativas e gerenciar o mapa de acessos com os privilégios adequados.

A regra deve garantir que somente usuários associados ao perfil Administrador tenham acesso às funcionalidades administrativas, respeitando as permissões configuradas e impedindo elevação indevida de privilégio.

### Critérios de Aceite:
- [ ] O usuário com perfil Administrador consegue acessar as funcionalidades previstas para esse perfil.
- [ ] Usuários sem o perfil Administrador não conseguem acessar as funcionalidades restritas, mesmo manipulando a URL ou a requisição.
- [ ] A autorização é validada no back-end e não somente na interface.
- [ ] As permissões do Administrador são aplicadas de forma consistente na interface, nos endpoints e nas operações disponíveis.
- [ ] As ações administrativas relevantes são registradas na trilha de auditoria.
- [ ] As variáveis de ambiente AWS necessárias são criadas, documentadas e configuradas nos ambientes aplicáveis.
- [ ] As credenciais e valores sensíveis não são expostos no código-fonte, na interface ou nos logs da aplicação.

### Pontos:
**5 pontos**

---

## História 9 — Análise de viabilidade para solicitação de criação de projeto via ServiceNow

### Título:
Analisar a viabilidade da criação de solicitações de projetos por meio do ServiceNow.

### Descrição:
Como responsável pelo processo de projetos, quero avaliar a viabilidade de criar uma solicitação de criação de projeto via ServiceNow, para identificar requisitos, integrações, regras de negócio e impactos técnicos antes da implementação.

A análise deve considerar o fluxo de abertura, o envio e recebimento de dados, o acompanhamento do status da solicitação, o tratamento de erros, a autenticação e os critérios necessários para uma futura implementação segura.

### Critérios de Aceite:
- [ ] O fluxo atual de solicitação de criação de projeto está documentado e comparado com o fluxo proposto no ServiceNow.
- [ ] Os dados obrigatórios, formatos, responsáveis e regras de negócio da solicitação estão identificados.
- [ ] A necessidade de integração entre a aplicação e o ServiceNow está mapeada, incluindo APIs, eventos ou webhooks aplicáveis.
- [ ] Os requisitos de autenticação, autorização, segurança e variáveis de ambiente estão identificados.
- [ ] Os possíveis retornos de sucesso, erro, indisponibilidade e duplicidade estão descritos.
- [ ] O acompanhamento do status e a sincronização das informações entre os sistemas estão avaliados.
- [ ] A análise apresenta conclusão de viabilidade, restrições, riscos, dependências e recomendação dos próximos passos.
- [ ] O resultado da análise está documentado e disponível para validação das partes responsáveis.

### Pontos:
**5 pontos**

---

## História 10 — Regra: Gestor visualiza apenas seus projetos

### Título:
Restringir o acesso do Gestor aos projetos sob sua responsabilidade.

### Descrição:
Como Gestor, quero visualizar apenas os projetos nos quais sou gestor ou supervisor, para garantir que o mapa de acessos e as informações de projetos respeitem meu escopo de responsabilidade.

A regra deve ser aplicada tanto na listagem de projetos quanto na consulta detalhada e no endpoint do mapa de acessos.

### Critérios de Aceite:
- [ ] Ao listar projetos, o Gestor recebe somente os projetos sob sua responsabilidade.
- [ ] A consulta direta de projeto fora do escopo retorna HTTP 403 ou 404 conforme a política de segurança.
- [ ] O mapa de acessos aplica a mesma restrição de escopo.
- [ ] A regra considera gestor, supervisor ou outro vínculo formal definido pelo negócio.
- [ ] A regra é aplicada no back-end e não depende apenas de filtros da interface.
- [ ] Tentativas de acesso fora do escopo são registradas na auditoria.
- [ ] As variáveis de ambiente AWS necessárias estão configuradas por ambiente e não contêm valores fixos no código.

### Pontos:
**5 pontos**

---

## História 11 — Regra: Patrocinador visualiza qualquer mapa

### Título:
Permitir ao Patrocinador consultar qualquer mapa de acessos.

### Descrição:
Como Patrocinador, quero consultar o mapa de acessos de qualquer projeto, para acompanhar de forma executiva a distribuição de acessos e os responsáveis pelos projetos sob gestão institucional.

O acesso deve ser global para leitura, sem conceder ao perfil poderes de alteração ou administração.

### Critérios de Aceite:
- [ ] O perfil Patrocinador consegue listar todos os projetos disponíveis para acompanhamento.
- [ ] O Patrocinador consegue consultar o mapa de acessos de qualquer projeto.
- [ ] O perfil não consegue alterar grupos, membros, permissões ou configurações administrativas sem permissão adicional.
- [ ] Consultas realizadas pelo Patrocinador são registradas na auditoria.
- [ ] O escopo global é aplicado no back-end.
- [ ] As variáveis de ambiente AWS necessárias estão configuradas por ambiente, sem credenciais no repositório.

### Pontos:
**3 pontos**

---

## História 12 — Regra: Administrador e viabilidade de criação via ServiceNow

### Título:
Garantir acesso administrativo e analisar a criação de projetos via ServiceNow.

### Descrição:
Como Administrador, quero possuir acesso completo às funcionalidades administrativas do SIGAC e, adicionalmente, quero avaliar a viabilidade de criar solicitações de novos projetos via ServiceNow, para centralizar a governança e reduzir atividades manuais.

A análise do ServiceNow deve resultar em uma decisão técnica documentada, contemplando autenticação, endpoint, campos obrigatórios, fluxo de aprovação, retorno da solicitação, tratamento de erros e impactos de segurança.

### Critérios de Aceite:
- [ ] O perfil Administrador possui acesso às funcionalidades administrativas autorizadas.
- [ ] O Administrador consegue consultar projetos, mapas, auditorias, configurações e permissões conforme a matriz aprovada.
- [ ] Operações administrativas relevantes são registradas na trilha de auditoria.
- [ ] O Administrador não recebe permissões implícitas além das definidas na matriz de acesso.
- [ ] A viabilidade da criação de solicitação de projeto via ServiceNow está documentada.
- [ ] A análise identifica API, autenticação, campos, estados, aprovações, SLA, dependências e riscos.
- [ ] A análise apresenta recomendação de implementação, não implementação ou prova de conceito.
- [ ] Variáveis de ambiente AWS necessárias para a futura integração são listadas, sem inclusão de secrets no código.

### Pontos:
**8 pontos**

---

## Resumo de estimativa

| História | Tema | Pontos |
|---|---|---:|
| 1 | Estratégia de consulta ao API Identidade | 3 |
| 2 | Serviço de membros de grupos | 5 |
| 3 | Contrato do mapa de acessos | 3 |
| 4 | Endpoint do mapa por projeto | 5 |
| 5 | Histórico de logs de auditoria | 5 |
| 6 | Registro de operações | 3 |
| 7 | Permissões dos logs | 3 |
| 8 | Consulta de logs do sistema | 5 |
| 9 | Exportação de auditoria | 3 |
| 10 | Regra de acesso do Gestor | 5 |
| 11 | Regra de acesso do Patrocinador | 3 |
| 12 | Regra do Administrador e ServiceNow | 8 |
| **Total** |  | **51** |

## Definition of Done comum

- [ ] Código revisado e aprovado por outro desenvolvedor.
- [ ] Lint, typecheck e testes executados com sucesso.
- [ ] Nenhum segredo versionado no repositório.
- [ ] Regras de autorização aplicadas no back-end.
- [ ] Logs sem senhas, tokens ou secrets.
- [ ] Documentação técnica atualizada.
- [ ] Configurações e variáveis de ambiente separadas por ambiente.
- [ ] Critérios de aceite validados pelo Product Owner ou responsável funcional.

## Dependências principais

1. Alinhamento com o time responsável pelo API Identidade.
2. Definição do mecanismo de autenticação e permissões da integração.
3. Configuração das variáveis de ambiente AWS em DEV, HMG e PROD.
4. Definição da matriz de perfis e permissões.
5. Disponibilidade do ambiente e dos contratos do ServiceNow para a análise de viabilidade.
6. Definição da política de retenção, mascaramento e exportação de logs.

> Observação: a numeração foi normalizada para 12 histórias. As cinco histórias de auditoria recebidas foram mantidas separadas para preservar rastreabilidade e facilitar o planejamento do backlog.
