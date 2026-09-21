# Manual rápido de desenvolvimento — Front-end

## Arquitetura em resumo

O front-end utiliza uma arquitetura de componentes, organizada por páginas e domínios. A página define a composição da rota, os componentes cuidam da interface, os hooks concentram estado e dados, e o cliente HTTP centraliza a comunicação com o back-end. O SWR mantém os dados em cache e revalida as informações quando necessário.

Em termos práticos, novas funcionalidades devem seguir o fluxo **Page → Component → Hook/SWR → API Client → Back-end**, mantendo a apresentação no front-end e as regras de negócio e autorização no servidor.

## Estado atual

O frontend utiliza Next.js App Router, TypeScript, Tailwind/shadcn, SWR para dados compartilhados e um cliente HTTP único em `lib/api-client.ts`.

Fluxo obrigatório:

```text
Page -> Component -> Hook/SWR -> lib/api-client.ts -> API FastAPI
```

O frontend controla apresentação, navegação e experiência. A autorização verdadeira continua no back-end.

## Onde criar cada arquivo

```text
app/(app)/<rota>/page.tsx          # página/rota
components/<dominio>/              # componentes específicos do domínio
components/shared/                 # componentes compartilhados da aplicação
components/ui/                     # componentes visuais reutilizáveis
hooks/use-<dominio>.ts             # dados e estado sincronizado com API
lib/api-client.ts                  # funções HTTP para endpoints
lib/types.ts                       # tipos compartilhados atuais
```

Mantenha páginas pequenas: a página compõe a tela; componentes e hooks concentram comportamento.

## Criando uma nova página

Crie a pasta dentro de `app/(app)`:

```text
app/(app)/relatorios/page.tsx
```

Exemplo:

```tsx
import { PageLayout } from "@/components/shared/page-layout"
import { ExampleList } from "@/components/examples/example-list"

export default function ExamplesPage() {
  return (
    <PageLayout title="Exemplos">
      <ExampleList />
    </PageLayout>
  )
}
```

A página não deve conter toda a lógica de API, filtros, tabelas e formulários em um único arquivo.

## Criando componentes

Use componentes específicos por domínio:

```text
components/examples/example-list.tsx
components/examples/example-filters.tsx
components/examples/example-form.tsx
```

Extraia um componente quando ele tiver responsabilidade própria, estado relevante, reutilização ou testes próprios. Use componentes de `components/ui` para manter aparência e acessibilidade consistentes.

Boas práticas:

- use HTML semântico;
- adicione `aria-label` quando necessário;
- forneça `alt` para imagens;
- mantenha estados de loading, vazio e erro;
- não crie cores e espaçamentos arbitrários fora dos tokens existentes;
- preserve o design system atual.

## Acesso a dados

Nunca use `fetch` diretamente em páginas ou componentes. Adicione uma função em `lib/api-client.ts`:

```ts
export function getExamples() {
  return request<ExampleListResponse>("/api/examples")
}
```

Depois crie um hook com SWR:

```tsx
"use client"

import useSWR from "swr"
import { getExamples } from "@/lib/api-client"

export function useExamples() {
  const result = useSWR("/api/examples", getExamples, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  return {
    examples: result.data?.items ?? [],
    isLoading: result.isLoading,
    error: result.error,
    refresh: result.mutate,
  }
}
```

Use `mutate` após criar, editar ou excluir um registro. Não use `localStorage` para persistência de dados do sistema.

## Formulários

- valide campos antes do envio;
- desabilite o botão durante a submissão;
- mostre erro de validação sem apagar os dados preenchidos;
- trate `401` e `403` separadamente de erro de rede;
- use o cliente API existente;
- preserve os fluxos de login por e-mail e CAV4.

Não coloque regras de autorização definitivas no formulário. O botão pode ser ocultado por capability, mas o backend deve validar novamente.

## Permissões e navegação

- Menus vêm do contexto da plataforma/API.
- Não crie menus protegidos hardcoded.
- Para ações, use o componente/padrão de capability existente.
- `401` deve levar ao login.
- `403` deve mostrar acesso negado.
- Durante o carregamento do contexto, não exiba ações protegidas incorretamente.

## Tipos

Prefira tipos explícitos:

```ts
export type Example = {
  id: string
  name: string
}
```

Evite `any`. Ao criar um contrato novo da API, atualize os tipos compartilhados e a função correspondente no `api-client.ts`.

## Cache e atualização

Use chaves SWR estáveis e iguais ao endpoint:

```text
/api/auth/session
/api/platform/context
/api/examples
```

Após uma mutação, revalide somente os recursos afetados. Não faça chamadas em `useEffect` para buscar dados; use Server Components quando apropriado ou SWR em componentes client.

## Tratamento de erros

Use `ApiError`/`isApiError` do cliente API:

```ts
try {
  await createExample(payload)
} catch (error) {
  if (isApiError(error, 403)) {
    // acesso negado
  }
}
```

Não exponha detalhes técnicos, tokens ou respostas internas para o usuário.

## Criando uma nova rota protegida

1. Crie `app/(app)/<rota>/page.tsx`.
2. Adicione o item ao catálogo/menu parametrizado, quando necessário.
3. Garanta capability no contexto e no backend.
4. Use os componentes de layout existentes.
5. Implemente loading, erro, vazio e sucesso.
6. Teste usuário autorizado e não autorizado.

## Login

Existem dois fluxos e ambos devem permanecer:

- login por e-mail;
- login corporativo CAV4.

Mudanças compartilhadas devem afetar apenas o pós-login comum: sessão, contexto e redirecionamento. Não remova o fallback de e-mail ao alterar o fluxo CAV4.

## Validação

Na raiz do projeto:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

Para alteração visual ou de navegação, valide também no preview/browser.

## Checklist rápido

- [ ] Página criada na rota correta.
- [ ] Lógica extraída para componentes/hooks quando necessário.
- [ ] Nenhum `fetch` direto fora do cliente API.
- [ ] Tipos criados sem `any`.
- [ ] SWR usado para dados client-side compartilhados.
- [ ] Loading, vazio, erro e sucesso tratados.
- [ ] Permissões não estão hardcoded.
- [ ] Layout e componentes existentes foram reutilizados.
- [ ] E-mail e CAV4 continuam funcionando.
- [ ] Typecheck, lint, build e E2E passaram.

## Regra principal

Se a mudança altera regra de negócio, permissão ou persistência, ela deve ser implementada e validada no back-end. O frontend não deve tentar substituir a API.
