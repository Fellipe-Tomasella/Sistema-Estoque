# 09 — Roadmap de desenvolvimento

Trabalhar **na ordem**. Cada etapa termina com: testes passando, critérios de aceite conferidos, checkboxes marcados aqui,
`decisoes.md` atualizado se algo mudou, commit. Não começar a próxima com a anterior quebrada.

Como pedir ao Claude Code (modelo de prompt para cada etapa):

> Leia `CLAUDE.md` e os docs citados na Etapa N do `docs/09-roadmap.md`. Faça um plano curto da etapa (arquivos que vai criar/alterar
> e testes), espere meu ok, depois implemente. Ao final rode lint, typecheck e testes, confira os critérios de aceite e marque os
> checkboxes da etapa.

---

## Etapa 0 — Fundação do repositório
Docs: 02, 08 §2.
> **Front-end adiado (decisão 016):** nas etapas abaixo, itens de tela ficam marcados “(front)” e são feitos depois da Etapa 10.

- [x] Monorepo Bun workspaces (`apps/api`, `packages/shared`; `apps/web` com o front), `tsconfig.base.json` strict, scripts raiz (ver CLAUDE.md).
- [x] ESLint + Prettier configurados para TS (Vue entra com o front).
- [x] `docker-compose.dev.yml` + `docker/dev-init.sql` (banco de teste + extensões).
- [x] API: Elysia com `/api/health`, `config/env.ts` validando variáveis, `error-handler`, `db/client.ts`, drizzle-kit configurado, primeira migration (extensões).
- [x] `container.ts` (instâncias de repositories/services) e padrão de módulo de exemplo (`modules/health`).
- [x] Setup de testes (`test/setup.ts`; `factories.ts` nasce na Etapa 2 com as primeiras entidades) rodando contra `estoque_test`.
- [ ] (front) Web: Vite + Vue + TS + Router + Pinia + vue-query + Tailwind v4 + shadcn-vue inicializado; `lib/api.ts` com Eden Treaty consumindo `/api/health`.
- [ ] (front) Proxy do Vite `/api → localhost:3000` (mesma origem em dev).
- [x] `packages/shared`: `money.ts` (com testes de `parseBRL`, `formatBRL`, `allocateDiscount`), `sizes.ts`, `enums.ts`.
- [x] CI básico (`ci.yml`).
- [x] Registrar versões instaladas em `decisoes.md`.

**Aceite:** `bun run dev` sobe a API e `/api/health` responde `db: true`; `bun run test` passa; CI verde.

## Etapa 1 — Acesso, layout e configurações
Docs: 02 §3.6, 04 RN-ACE, 06 §2 e §3.8.
- [x] Tabelas `users`, `sessions`, `password_resets`, `store_settings`, `audit_log`.
- [x] Login/logout/logout-all/me, sessão com cookie seguro, rate limit, origin-check.
- [x] Esqueci/redefinir senha (SMTP opcional) + scripts `create-user` e `reset-password` (`bun run --filter @estoque/api user:create -- --name … --email …`).
- [ ] (front) `AppLayout` responsivo (sidebar desktop / barra inferior mobile), guard de rotas, tela de login.
- [x] Configurações (API): dados da loja, UF, fuso, regime, switch fiscal, rodapé, alterar senha, sair de todos. Tema fica no front.
- [ ] (front) Componentes comuns: `PageHeader`, `MoneyInput`, `MoneyText`, `DateText`, `StatusBadge`, `ConfirmDialog`, `EmptyState`, toasts, banner off-line.
- [x] `business-date.ts` com testes (virada de dia no fuso da loja).

**Aceite:** só entra logado; sessão vale no notebook e no celular; reset de senha funciona por script; layout ok em 375px e 1280px (front).

## Etapa 2 — Produtos e variações
Docs: 03 §3.3, 04 RN-PRO, RN-EST-02, 05 Produtos, 06 §3.2.
- [x] Schema `products`, `variants`, `stock_movements` (o `StockService` nasce aqui com `initial`).
- [x] CRUD de produto com variações, quantidade inicial e mínimo (“gerar combinações” é da tela; a API recebe a lista).
- [x] Busca sem acento + filtros; `/variants/search`; sugestões de cor/tamanho/categoria.
- [x] Inativar/reativar; excluir só sem histórico; corrigir rótulo com auditoria.
- [ ] (front) Telas: lista, formulário, detalhe com grade cor × tamanho.

**Aceite:** RN-PRO-01…11 testadas; criar “Blusa básica” com Preta/P, Preta/M, Branca/M e saldos → aparecem certos na grade.

## Etapa 3 — Estoque: entradas, acertos, histórico, alertas, importação
Docs: 04 RN-EST, RN-IMP, 05 Estoque, 06 §3.3.
- [x] Entradas (`stock_entries`, itens, movimentos `purchase_entry`) com idempotência.
- [x] Acertos (contagem / perda / avaria / erro / outro).
- [x] Histórico por variação e geral.
- [x] Visão geral do estoque com “sem estoque” e “repor” (`/products?stock=out|low` + `/stock/alerts`); mínimo em massa.
- [x] Importação: modelo, prévia, erros por linha, efetivar idempotente.
- [x] `scripts/check-integrity.ts` (invariante 1) — `bun run --filter @estoque/api check-integrity`.

**Aceite:** cenário A7; saldo nunca negativo; importar planilha de exemplo (fixture com erros) mostra erros e efetiva o resto; integridade ok.

## Etapa 4 — Clientes
Docs: 04 RN-CLI, 05 Clientes.
- [x] CRUD, busca por nome/telefone, CPF/CNPJ validados, endereço opcional, inativar. (`openBalanceCents` na lista entra com o fiado, Etapa 6.)
- [ ] (front) Componente `CustomerPicker` com cadastro rápido (usado no PDV) — a API já aceita o cadastro só com nome + telefone.

**Aceite:** dois clientes “Maria” distinguíveis em toda lista/busca.

## Etapa 5 — PDV e vendas
Docs: 04 RN-VEN, RN-PAG, RN-ENV, RN-FIS-01…05, 05 Vendas, 06 §3.4–3.5.
- [x] Schema `sales`, `sale_items`, `payments`, `receivables`, sequence de número (`receivable_allocations`/`receivable_adjustments` nascem nas Etapas 6 e 7, onde são usadas).
- [x] Rascunho no servidor com `version`, recalcular totais, motivo de bloqueio.
- [x] Desconto R$/% substitutivo; rateio na confirmação.
- [x] Pagamentos múltiplos, toggle de confirmação Pix/cartão, troco, **entrada + fiado** (cria dívida).
- [x] Confirmação transacional com lock e idempotência (testes A1, A6, A10).
- [x] Envio simples (situação, endereço, UF, rastreio).
- [x] Classificação fiscal na confirmação.
- [x] Histórico de vendas com filtros; detalhe com linha do tempo; troca de forma de pagamento.
- [x] Comprovante PDF. (front) Página de impressão + compartilhar.
- [ ] (front) Telas: PDV desktop (2 colunas) e mobile (passos), atalhos de teclado.

**Aceite:** A1, A5, A6, A10 passando; venda com entrada + fiado gera dívida certa; comprovante de venda com fiado mostra pago e saldo, e o aviso “não é documento fiscal”.

## Etapa 6 — Fiado
Docs: 04 RN-FIA, 05 Fiado, 06 §3.6.
- [x] Lista de clientes com saldo (`/customers?withOpenBalance=true`), “em atraso” só com data combinada vencida.
- [x] Detalhe de dívidas por cliente.
- [x] Recebimento com prévia e distribuição editável, idempotente; comprovante de recebimento.
- [x] Estorno de recebimento com motivo.
- [x] Alterar data combinada.
- [ ] *(Opcional, só se a cliente confirmar)* Saldo anterior de fiado — RN-FIA-11.

**Aceite:** A2; tentar receber acima do saldo é bloqueado; estorno reabre saldo; invariante 2 ok.

## Etapa 7 — Cancelamento
Docs: 04 RN-CAN, RN-DEV-07/08, 05 Cancelamento/Devoluções (receber peça, refunds), 06 §3.5.
- [x] `cancel-preview` e `cancel` com as duas situações (peças com a loja / com a cliente).
- [x] `returns` tipo `cancellation` + receber peça (apta/avariada).
- [x] `refunds`: pendente → devolvido (forma/data) / anulado.
- [x] Alerta fiscal `cancel_pending` (feito na Etapa 10, junto com `fiscal_documents`).
- [x] Pendências na API (`GET /returns`, `GET /refunds?status=pending`). (front) Tela de Pendências.

**Aceite:** A3, A4; exemplo R$ 150 / pago R$ 50 → dívida R$ 100 cancelada e R$ 50 a devolver; cancelar 2× não duplica nada.

## Etapa 8 — Devolução parcial e troca
Docs: 04 RN-DEV, 05 Devoluções, 06 §3.5.
- [x] Prévia e execução de devolução parcial (abate fiado → devolução de valor).
- [x] Troca em transação única com nova venda e `exchange_credit`.
- [x] Fórmula de valor proporcional sem perda de centavos (testes com desconto e quantidades ímpares).
- [x] `returned_qty` e limites de quantidade.

**Aceite:** A8, A9; devolver 1 de 3 peças com desconto e depois as outras 2 soma exatamente o total da linha; invariante 4 ok.

## Etapa 9 — Relatórios e fechamento diário
Docs: 04 RN-REL, RN-FEC, 05 Relatórios, 06 §3.7.
- [x] Vendas por período (dia/semana/mês) com canceladas e devoluções separadas.
- [x] Fiado em aberto.
- [x] Mais e menos vendidos (produto e variação, incluindo sem venda).
- [x] Fechamento: cálculo, dinheiro contado, salvar snapshot, “alterado depois”.
- [x] CSV de cada relatório (`/reports/sales.csv`, `/reports/receivables.csv`, `/reports/products-ranking.csv`).
- [x] Início (`/dashboard`) com todos os cartões de aviso (pendências fiscais refinadas na Etapa 10).

**Aceite:** um dia de teste com venda à vista, venda fiado, recebimento de fiado antigo, cancelamento com devolução de valor e estorno →
fechamento bate com conta feita à mão (teste automatizado com esse roteiro).

## Etapa 10 — Fiscal (registro manual)
Docs: 07, 04 RN-FIS, 05 Fiscal.
- [x] `fiscal_documents` + registrar/corrigir/cancelar.
- [x] Pendências fiscais (`/fiscal/pending` + Início), faixa “aguardando validação do contador”. (front) Aba na tela de Pendências.
- [x] Número da NF no comprovante quando registrada.

**Aceite:** venda para cliente com CNPJ aparece como pendência até registrar a NF; envio para outra UF aparece como “revisar”.

## Etapa 11 — PWA e acabamento mobile
Docs: 06 §5.
- [ ] `vite-plugin-pwa`: manifest, ícones, SW só app shell, `/api` NetworkOnly, aviso de nova versão.
- [ ] Revisão de todas as telas em 375px; barra inferior; PDV em passos.
- [ ] Tela “Instalar no celular”.

**Aceite:** instala no Android e no iPhone; sem internet mostra o aviso e não tenta salvar; Lighthouse PWA sem erros de instalabilidade.

## Etapa 12 — Produção
Docs: 08.
- [ ] Dockerfile, entrypoint com migrations, compose de produção, `backup.sh`, exemplo de Nginx.
- [ ] `release.yml` (GHCR).
- [ ] Exportação ZIP (RN-ACE-04).
- [ ] Testes E2E Playwright dos cenários A1–A10 + login.
- [ ] Subir na VPS seguindo o runbook; testar restauração de backup.
- [ ] README com operação básica para o dev.

**Aceite:** sistema no ar com HTTPS, backup diário gerado e restaurado em teste, E2E verde.

---

## Depois da v1 (só com confirmação)
Saldo anterior de fiado (se não entrou na 6) · canal de venda · taxa de entrega · reserva de peças · abertura/retiradas de caixa ·
foto do produto · emissão fiscal integrada · app nativo.
