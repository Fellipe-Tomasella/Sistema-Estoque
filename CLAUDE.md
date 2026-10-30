# CLAUDE.md — Sistema de Estoque, Vendas e Fiado

Este arquivo é lido automaticamente pelo Claude Code. Ele resume como trabalhar neste repositório.
Os detalhes estão em `docs/`. **Leia os documentos antes de escrever código.**

## O que é

Sistema web (com PWA) para uma loja on-line de roupas operada por **uma única pessoa (a dona)**.
Controla produtos com variações (cor/tamanho), estoque, vendas (PDV), pagamentos (dinheiro, Pix, cartão, fiado),
clientes e fiado, cancelamentos, devoluções/trocas, relatórios, fechamento diário e o tratamento fiscal de um **MEI**.

Foco: **notebook (desktop)**. Celular: consulta e operações simples, instalável como PWA. Sem uso off-line.

## Ordem de leitura

1. `docs/00-contexto-cliente.md` — levantamento original da cliente (fonte da verdade do negócio).
2. `docs/01-visao-e-escopo.md` — entendimento, escopo v1, o que está fora.
3. `docs/02-arquitetura.md` — stack, pastas, camadas, convenções.
4. `docs/03-modelo-de-dados.md` — tabelas, restrições, glossário PT→EN.
5. `docs/04-regras-de-negocio.md` — regras numeradas (RN-xxx). **Toda regra tem teste.**
6. `docs/05-api.md` — contrato das rotas.
7. `docs/06-telas-e-ux.md` — telas, fluxos, responsivo, PWA.
8. `docs/07-fiscal-mei.md` — o que o sistema faz (e não faz) na parte fiscal.
9. `docs/08-deploy.md` — Docker, VPS com Nginx/Portainer, backup.
10. `docs/09-roadmap.md` — **etapas de desenvolvimento, na ordem**. Trabalhe uma etapa por vez.
11. `docs/10-pendencias.md` — perguntas abertas para a cliente e o contador.
12. `docs/decisoes.md` — registro de decisões (ADR). Consulte antes de mudar algo estrutural.

## Stack (resumo — justificativas em docs/02)

- Monorepo com **Bun workspaces**: `apps/api`, `apps/web`, `packages/shared`.
- API: **Bun + Elysia + TypeScript**, validação com TypeBox (`t` do Elysia), **Drizzle ORM** + `postgres` (postgres.js), **PostgreSQL**.
- Web: **Vue 3 + Vite + TypeScript**, Vue Router, Pinia, TanStack Query (vue-query), **shadcn-vue + Tailwind CSS v4**, lucide-vue-next, vee-validate + zod.
- Cliente HTTP tipado: **Eden Treaty** (tipos vêm direto da API).
- PWA: `vite-plugin-pwa` (instalável; sem cache de dados da API).
- Deploy: Docker (1 imagem `app` que serve API + SPA) + Postgres + backup, atrás do **Nginx já existente** na VPS, gerenciado pelo Portainer.

## Comandos (criar na Etapa 0 e manter atualizados aqui)

```bash
cp .env.example .env             # primeira vez
bun install                      # instala tudo (workspaces)
bun run dev                      # sobe a api (3000); web (5173) entra quando o front for feito
bun run db:up                    # Postgres local via docker-compose.dev.yml (db:down para parar)
bun run db:generate              # gera migration a partir do schema Drizzle
bun run db:migrate               # aplica migrations
bun run db:seed                  # dados de exemplo (só dev)
bun run test                     # testes da API (bun test) contra banco de teste
bun run test:web                 # (com o front) testes de componentes (vitest)
bun run test:e2e                 # (com o front) playwright (fluxos críticos)
bun run lint && bun run typecheck
bun run build                    # build de produção (web + api)
```

## Regras de trabalho (obrigatórias)

1. **Uma etapa do `docs/09-roadmap.md` por vez.** Ao terminar: testes passando, critérios de aceite conferidos, checkboxes marcados no roadmap.
2. **Regras de negócio vêm de `docs/04`.** Se precisar mudar ou criar uma regra, atualize o doc e registre em `docs/decisoes.md` no mesmo commit. Nunca invente regra de negócio em silêncio — se a dúvida for de negócio, pare e pergunte.
3. **Camadas na API** (ver docs/02): `*.routes.ts` (HTTP) → `*.service.ts` (classe com regra de negócio e transação) → `*.repository.ts` (classe com queries Drizzle). Rota não acessa banco. Repository não tem regra de negócio.
4. **Dinheiro sempre em centavos inteiros** (`integer`, sufixo `Cents`). Nunca `float`/`numeric` em JS. Formatação só na borda (UI/PDF).
5. **Datas:** `timestamptz` em UTC + coluna `business_date` (data local da loja, fuso em `store_settings.timezone`). Relatórios e fechamento usam `business_date`.
6. **Estoque só muda via `StockService`**, que grava `stock_movements` e atualiza `variants.stock_qty` na mesma transação. Proibido `UPDATE variants SET stock_qty` fora dele.
7. **Nada financeiro é apagado.** Vendas, pagamentos, movimentos e devoluções são anulados/estornados com motivo, nunca `DELETE`.
8. **Idempotência:** confirmação de venda, recebimentos e cancelamentos devem ser seguros contra clique duplo, recarregamento e dois dispositivos (ver RN-VEN-08, RN-FIA-09, RN-CAN-07).
9. **Textos da interface em português do Brasil.** Código, nomes de tabelas e variáveis em inglês (glossário em docs/03).
10. **Não adicionar** metas, KPIs, dashboards comerciais, multiusuário, multiempresa, marketplace, integrações (maquininha, bancos, redes sociais, transportadoras, emissor fiscal) sem pedido registrado em `docs/decisoes.md`.
11. **Comprovante não é nota fiscal.** Todo comprovante traz “Não é documento fiscal”. Ver docs/07.
12. Commits pequenos, mensagem em português, prefixo convencional (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

## Definição de pronto (por tarefa)

- Tipos ok (`bun run typecheck`), lint ok.
- Testes de serviço cobrindo as RN da tarefa (caminho feliz + erros + idempotência quando aplicável).
- Tela funcionando no desktop **e** conferida em largura de celular (375px).
- Mensagens de erro compreensíveis em pt-BR.
- Docs atualizados se algo mudou.
