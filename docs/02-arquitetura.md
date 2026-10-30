# 02 — Arquitetura e escolhas técnicas

## 1. Escolhas e motivos

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Runtime | **Bun** (versão estável mais recente, fixada no Dockerfile e em `packageManager`) | Pedido do dev. Roda TS direto, test runner, gerenciador de pacotes e workspaces num binário só. Hash de senha nativo (`Bun.password`, argon2id). |
| Framework API | **Elysia** | Feito para Bun, rápido, validação embutida (TypeBox) e **Eden Treaty**: o front importa os *tipos* da API e ganha autocomplete/checagem nas chamadas sem gerar código. O dev já usa Elysia em outro projeto. |
| Banco | **PostgreSQL** (major atual estável, fixado no compose) | Pedido do dev. Transações e `SELECT … FOR UPDATE` resolvem estoque/duplicidade; `CHECK` e `UNIQUE` garantem regras no próprio banco. |
| ORM | **Drizzle ORM** + **drizzle-kit** + driver `postgres` (postgres.js) | Schema em TS, migrations versionadas em SQL legível, SQL quase explícito (bom para relatórios). postgres.js é o driver mais testado com Drizzle. |
| Front | **Vue 3 (Composition API, `<script setup>`) + Vite + TS** | Pedido do dev. SFC deixa cada tela/componente num arquivo. |
| Roteamento/estado | **Vue Router** + **Pinia** (estado local: sessão, carrinho) + **TanStack Query para Vue** (estado do servidor: cache, refetch, invalidação) | Separar “dados do servidor” de “estado de tela” evita store gigante e bugs de dados velhos entre notebook e celular. |
| UI | **shadcn-vue** (sobre Reka UI) + **Tailwind CSS v4** + **lucide-vue-next** | Escolha do dev. Componentes ficam no repositório (`components/ui`), acessíveis, fáceis de ajustar. |
| Formulários | **vee-validate + zod** (padrão do shadcn-vue Form) | Validação no front com mensagens pt-BR. A API valida de novo (TypeBox). |
| PWA | **vite-plugin-pwa** (Workbox) | Manifest + service worker gerados no build. Configurado só para instalar e cachear o *app shell*. |
| PDF | **pdfmake** no servidor | JS puro, roda no Bun sem Chromium. Comprovantes simples e leves. |
| Planilhas | **ExcelJS** (.xlsx) e **papaparse** (.csv) no servidor | Importação com validação e prévia no backend. |
| Testes | **bun test** (API, contra Postgres real de teste), **Vitest + Vue Test Utils** (componentes críticos), **Playwright** (fluxos ponta a ponta) | Regras de estoque/dinheiro precisam ser testadas com banco real (transação, lock, constraint). |
| Qualidade | **TypeScript strict**, **ESLint** (typescript-eslint + eslint-plugin-vue) + **Prettier** | Padrão conhecido, funciona bem com `.vue`. |
| Deploy | **Docker** multi-stage: 1 imagem `app` (API serve também a SPA) + `postgres` + `backup`, atrás do **Nginx existente**, stack no **Portainer** | Mesmo domínio para API e front → cookie de sessão simples, sem CORS. |

> **Versões:** não fixamos números aqui porque mudam. Na Etapa 0, instalar as versões estáveis atuais, travar no
> `bun.lock`, e anotar as majors em `decisoes.md`. Conferir a doc oficial de cada lib ao implementar (shadcn-vue, Tailwind v4 e Elysia mudam rápido).

### Por que não…

- **Nuxt?** SSR/SEO não servem para um painel privado. SPA + Vite é mais simples de manter e de servir pela própria API.
- **Hono?** Também roda no Bun, mas o Eden Treaty do Elysia dá tipagem ponta a ponta sem gerar cliente.
- **Controllers em classe no Elysia?** A doc do Elysia recomenda usar a própria instância como “controller”. Então o arquivo
  `*.routes.ts` faz o papel de controller (HTTP fino) e **a orientação a objetos fica nos Services e Repositories** (classes).
- **Banco no navegador/offline-first?** Off-line não foi pedido e duplicaria regras de estoque/dinheiro. Fica fora.

## 2. Estrutura de pastas

```
sistema-estoque/
├── CLAUDE.md
├── README.md
├── package.json                 # workspaces + scripts raiz
├── bun.lock
├── tsconfig.base.json
├── .env.example
├── docker-compose.dev.yml       # só Postgres (dev + teste)
├── docker-compose.yml           # produção (Portainer)
├── docker/
│   ├── Dockerfile               # multi-stage: build web + api → runtime bun
│   ├── entrypoint.sh            # roda migrations e sobe a API
│   └── nginx/
│       └── estoque.conf.example # server block para o Nginx existente
├── docs/                        # estes documentos
├── packages/
│   └── shared/                  # código usado pelos dois lados
│       └── src/
│           ├── enums.ts         # status, formas de pagamento, tipos de movimento…
│           ├── money.ts         # parse/format de centavos, rateio de desconto
│           ├── sizes.ts         # ordem de tamanhos (PP, P, M… 34, 36… U)
│           └── index.ts
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts                 # sobe o servidor
│   │       ├── app.ts                   # monta o Elysia: plugins + módulos; exporta `type App`
│   │       ├── config/env.ts            # leitura/validação de variáveis de ambiente
│   │       ├── db/
│   │       │   ├── client.ts            # conexão drizzle + tipo Tx
│   │       │   ├── schema/              # 1 arquivo por agregado (products.ts, stock.ts, sales.ts…)
│   │       │   ├── migrations/          # geradas pelo drizzle-kit (commitadas)
│   │       │   └── seed.ts
│   │       ├── shared/
│   │       │   ├── errors.ts            # AppError, NotFound, Conflict, BusinessRule…
│   │       │   ├── error-handler.ts     # plugin onError → JSON padrão pt-BR
│   │       │   ├── auth.plugin.ts       # derive user da sessão; guard
│   │       │   ├── origin-check.plugin.ts
│   │       │   ├── business-date.ts     # data local da loja a partir do fuso configurado
│   │       │   ├── audit.service.ts     # grava audit_log
│   │       │   └── pagination.ts
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── settings/
│   │       │   ├── products/            # produtos + variações
│   │       │   ├── stock/               # movimentos, entradas, ajustes, importação
│   │       │   ├── customers/
│   │       │   ├── sales/               # rascunho, confirmação, envio, comprovante
│   │       │   ├── receivables/         # fiado: dívidas, recebimentos, estornos
│   │       │   ├── cancellations/       # cancelamento de venda
│   │       │   ├── returns/             # devolução parcial, troca, retorno físico, devolução de valores
│   │       │   ├── reports/             # consultas + fechamento diário
│   │       │   ├── fiscal/
│   │       │   └── exports/
│   │       └── scripts/
│   │           ├── create-user.ts       # cria a conta da dona
│   │           └── reset-password.ts    # recuperação pelo servidor (fallback)
│   │   └── test/
│   │       ├── setup.ts                 # banco de teste, truncate entre testes
│   │       └── factories.ts             # criar produto/variação/cliente/venda rápido
│   └── web/
│       ├── package.json
│       ├── vite.config.ts               # inclui vite-plugin-pwa
│       ├── components.json              # config shadcn-vue
│       ├── index.html
│       ├── public/icons/                # ícones PWA (192, 512, maskable)
│       └── src/
│           ├── main.ts
│           ├── App.vue
│           ├── router/index.ts          # rotas + guard de autenticação
│           ├── layouts/
│           │   ├── AppLayout.vue        # sidebar (desktop) / bottom nav (mobile)
│           │   └── AuthLayout.vue
│           ├── components/
│           │   ├── ui/                  # gerados pelo shadcn-vue (não editar à toa)
│           │   └── common/              # MoneyInput, MoneyText, DateText, StatusBadge, ConfirmDialog, EmptyState, PageHeader, SearchInput…
│           ├── lib/
│           │   ├── api.ts               # Eden Treaty client (credentials: 'include')
│           │   ├── query.ts             # QueryClient + chaves padronizadas
│           │   ├── format.ts            # Intl pt-BR para R$ e datas
│           │   └── errors.ts            # traduz erro da API para toast
│           ├── stores/
│           │   ├── auth.store.ts
│           │   └── cart.store.ts        # carrinho do PDV (persistido no rascunho do servidor)
│           ├── modules/                 # espelha os módulos da API
│           │   ├── dashboard/pages/HomePage.vue
│           │   ├── products/{pages,components,composables}/
│           │   ├── stock/…
│           │   ├── pos/…                # Nova venda
│           │   ├── sales/…
│           │   ├── customers/…
│           │   ├── receivables/…
│           │   ├── reports/…
│           │   ├── fiscal/…
│           │   └── settings/…
│           └── styles/main.css          # Tailwind v4 + tema
```

### Padrão de um módulo da API

```
modules/products/
├── products.routes.ts      # Elysia plugin: rotas, schemas de entrada/saída, chama o service
├── products.schemas.ts     # DTOs TypeBox (t.Object…) de entrada e saída
├── products.service.ts     # class ProductsService — regras, transações, chama repositories
├── products.repository.ts  # class ProductsRepository — queries Drizzle, recebe `db | tx`
└── products.test.ts        # testes do service (banco real)
```

Regras das camadas:

- **routes**: valida entrada (TypeBox), pega `user` do contexto, chama 1 método do service, devolve DTO. Sem SQL, sem regra.
- **service**: classe com dependências no construtor (repositories, outros services). Abre transação (`db.transaction`) quando
  a operação mexe em mais de uma tabela. Lança `AppError`s com mensagem pt-BR. **Toda RN mora aqui.**
- **repository**: classe; cada método recebe `tx` opcional para participar da transação do service. Sem regra de negócio.
- **Injeção simples**: um arquivo `apps/api/src/container.ts` instancia repositories e services uma vez e os módulos usam
  `.decorate('services', container)` no Elysia. Sem framework de DI.

Exemplo mínimo (orientativo):

```ts
// products.routes.ts
export const productsRoutes = new Elysia({ prefix: '/products' })
  .use(authGuard)
  .get('/', ({ query, services }) => services.products.list(query), { query: ListProductsQuery })
  .post('/', ({ body, services, user }) => services.products.create(body, user), { body: CreateProductBody })

// products.service.ts
export class ProductsService {
  constructor(private repo: ProductsRepository, private stock: StockService, private audit: AuditService) {}
  async create(input: CreateProductInput, user: User) {
    return db.transaction(async (tx) => { /* valida variações únicas, cria produto, variações, saldo inicial via stock */ })
  }
}
```

### Padrão de um módulo do front

```
modules/products/
├── pages/ProductsListPage.vue, ProductFormPage.vue, ProductDetailPage.vue
├── components/VariantGrid.vue, VariantRow.vue, ProductFilters.vue
├── composables/useProducts.ts   # useQuery/useMutation com chaves de lib/query.ts
└── products.api.ts              # funções finas sobre o Eden client
```

Página só orquestra; componente só exibe/emite eventos; composable fala com a API.

## 3. Convenções transversais

### 3.1 Dinheiro
- `integer` em centavos no banco; `number` inteiro no TS; nomes com sufixo `Cents` (`totalCents`).
- `packages/shared/money.ts`: `parseBRL("1.234,56") → 123456`, `formatBRL(123456) → "R$ 1.234,56"`,
  `allocateDiscount(items, discountCents)` (rateio proporcional, sobra de centavos nas linhas de maior resto — determinístico, decisão 017).
- Percentual de desconto guardado em **pontos-base** (`1050` = 10,50%).

### 3.2 Datas e fuso
- `timestamptz` (UTC) para instantes. `date` para `business_date`.
- `store_settings.timezone` (padrão `America/Sao_Paulo`; **[A] confirmar estado da loja**).
- `business_date` é calculado **no servidor** no momento do fato (confirmação, recebimento, devolução realizada) e gravado.
- Semana nos relatórios: segunda a domingo.

### 3.3 IDs e números
- PK `uuid` (v7 via `Bun.randomUUIDv7()` gerado na aplicação — ordenável).
- Número humano de venda (`sales.number`) vem de `sequence` **na confirmação** (rascunhos não consomem número).
  Exibir como `#000123`.

### 3.4 Erros
Formato único da API:
```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Só há 2 unidades de Blusa básica Preta/M.", "details": { "variantId": "…", "available": 2 } } }
```
Códigos em `packages/shared/enums.ts` (`ErrorCode`). HTTP: 400 validação, 401, 403, 404, 409 conflito/estado, 422 regra de negócio.

### 3.5 Idempotência e concorrência
- **Confirmar venda**: operação sobre um rascunho já existente (`POST /sales/:id/confirm`). Dentro da transação:
  `SELECT … FOR UPDATE` na venda; se já `confirmed`, retorna a mesma venda com `alreadyProcessed: true` (200);
  depois trava as variações em ordem de `id` (evita deadlock), confere saldo, baixa, grava movimentos.
- **Recebimentos / devoluções de valor / pagamentos**: o cliente envia `Idempotency-Key` (uuid gerado ao abrir o formulário).
  A chave vira o `id` do registro criado (pagamento, entrada, acerto, devolução/troca, devolução de valor) → `UNIQUE` no banco.
  Repetição devolve o registro existente.
- **Cancelamento**: trava a venda; se já `cancelled`, retorna o existente. Movimentos de estoque têm `UNIQUE (ref_type, ref_id, variant_id, type)`.
- **Edição concorrente de rascunho** (notebook + celular): coluna `version` em `sales`; `PATCH` envia `version`; divergência → 409 “Esta venda foi alterada em outro aparelho. Recarregue.”
- **Front**: botão de confirmar desabilita durante a requisição e mostra resultado inequívoco (“Venda #000123 confirmada”).

### 3.6 Autenticação e segurança
- Login por **e-mail + senha**. Hash `Bun.password.hash` (argon2id).
- **Sessão no servidor** (tabela `sessions`), token aleatório de 32 bytes no cookie `sid`: `HttpOnly; Secure; SameSite=Lax; Path=/`;
  guarda-se só o **hash** do token. Expira após 30 dias sem uso (renovação deslizante). Logout apaga a sessão.
  “Sair de todos os aparelhos” em Configurações.
- **CSRF**: SameSite=Lax + plugin que, em métodos de escrita, exige `Origin` igual a `APP_ORIGIN`.
- **Rate limit** no login (ex.: 5 tentativas / 15 min por IP+e-mail, em memória — 1 instância só).
- **Recuperação de acesso**: (1) “Esqueci a senha” envia link por e-mail via SMTP configurável (token de uso único, 1h);
  (2) se SMTP não estiver configurado, `bun run scripts/reset-password.ts` no servidor. Ver `08-deploy.md`.
- Headers de segurança (CSP compatível com a SPA, `X-Content-Type-Options`, `Referrer-Policy`) na API; HSTS no Nginx.
- Dados pessoais mínimos (LGPD): CPF/CNPJ e endereço só quando necessários (fiscal/envio). Exportação e backup protegidos.
- Sem cadastro público: a conta é criada por script (`create-user.ts`).

### 3.7 Auditoria
- `stock_movements` é o histórico do estoque (ledger).
- `audit_log` guarda ações sensíveis: alteração de preço, inativação, ajuste, cancelamento, estorno de recebimento,
  devolução de valor, registro/alteração fiscal, importação, login. Campos: `entity`, `entity_id`, `action`, `before`, `after`, `reason`, `user_id`, `created_at`.

### 3.8 Front: comportamento padrão
- Toda mutação: botão com estado *loading*, toast de sucesso com o que foi salvo, invalidação das queries afetadas.
- Erros da API viram toast com `message` (já em pt-BR).
- `refetchOnWindowFocus: true` → celular e notebook se mantêm em dia.
- Sem conexão: banner “Sem internet — nada será salvo até a conexão voltar” e botões de escrita desabilitados.

## 4. Testes

- **API (prioridade máxima)**: cada RN de `04-regras-de-negocio.md` tem pelo menos um teste com o ID no nome:
  `test('RN-EST-05 ajuste por contagem define o saldo, não soma', …)`.
  Banco de teste separado (`DATABASE_URL_TEST`), migrations aplicadas no setup, `TRUNCATE … CASCADE` entre testes.
- **Concorrência**: teste que dispara 2 confirmações simultâneas para a última unidade → exatamente 1 sucesso.
- **Web**: Vitest nos componentes com lógica (MoneyInput, carrinho/totais, alocação de recebimento).
- **E2E (Playwright)**: os 6 exemplos da seção 13 do contexto + login. Rodam contra `docker-compose.dev.yml`.

## 5. Variáveis de ambiente (`.env.example`)

```
NODE_ENV=development
PORT=3000
APP_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://estoque:estoque@localhost:5432/estoque
DATABASE_URL_TEST=postgres://estoque:estoque@localhost:5432/estoque_test
SESSION_SECRET=troque-isto            # usado para derivar hash de tokens
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Loja <nao-responda@dominio>"
```
