# Registro de decisões (ADR)

Formato: data · decisão · motivo · quem decidiu. Mais recentes no fim. **Não apagar entradas**; se mudar, criar outra que substitui.

| # | Data | Decisão | Motivo | Quem |
| --- | --- | --- | --- | --- |
| 001 | 30/10/2026 | Stack: Bun + Elysia + Drizzle + PostgreSQL; Vue 3 + Vite + TS; Docker na VPS. | Pedido do dev; Elysia/Drizzle já usados por ele; Eden Treaty dá tipos ponta a ponta. | Dev + Claude |
| 002 | 30/10/2026 | UI com **shadcn-vue + Tailwind CSS v4**. | Escolha do dev; componentes no código, fáceis de ajustar. | Dev |
| 003 | 30/10/2026 | Monorepo Bun workspaces: `apps/api`, `apps/web`, `packages/shared`. | Tipos e utilitários (dinheiro, enums) compartilhados; um repositório só. | Claude |
| 004 | 30/10/2026 | API em camadas **routes → service (classe) → repository (classe)**; sem controller separado. | Organização “quase OO” pedida pelo dev, seguindo a recomendação do Elysia para a camada HTTP. | Claude |
| 005 | 30/10/2026 | Dinheiro em centavos inteiros; datas com `business_date` no fuso da loja. | Evitar erro de arredondamento e de virada de dia no fechamento. | Claude |
| 006 | 30/10/2026 | Estoque como ledger (`stock_movements`) + saldo em cache com CHECK ≥ 0. | Histórico completo e proteção contra saldo negativo/duplicidade no banco. | Claude |
| 007 | 30/10/2026 | Sessão no servidor com cookie HttpOnly; login e-mail + senha (argon2id). | Usuária única, revogação simples, sem JWT para gerenciar. | Claude |
| 008 | 30/10/2026 | Uma imagem `app` serve API + SPA, atrás do **Nginx já existente** na VPS, stack no Portainer. | Mesma origem (sem CORS), menos peças para manter; dev já usa Nginx/Portainer. | Dev + Claude |
| 009 | 30/10/2026 | **PWA instalável, sem off-line de dados.** | Benefício de “app” com custo baixo; off-line não foi pedido e arrisca estoque/dinheiro. | Dev + Claude |
| 010 | 30/10/2026 | Empresa é **MEI**. v1 **não emite** nota: classifica a venda (PF/PJ/interestadual), mostra pendências e registra a NF emitida fora. | Res. CGSN 195/2026 (DASN-Simei para PF a partir de 2027) e obrigação para CNPJ; volume desconhecido; contador ainda vai validar. | Dev (MEI) + Claude |
| 011 | 30/10/2026 | Entram na v1: **entrada + resto no fiado**, **envio simples**, **importação de planilha**, **devolução parcial e troca**. | Escolha do dev. | Dev |
| 012 | 30/10/2026 | Troca = devolução + **nova venda** paga com `exchange_credit`; sobra a favor da cliente abate fiado da venda original e depois vira devolução de valor (sem vale-troca). | Reaproveita as regras do PDV; não assume política de crédito (pendência P8). | Claude |
| 013 | 30/10/2026 | Valor devolvido/cancelado abate **primeiro o fiado em aberto** da venda; o restante vira devolução de valor pendente. | Mesma regra para cancelamento e devolução; nunca devolve dinheiro de dívida não paga. | Claude |
| 014 | 30/10/2026 | Preço unitário não é editável no PDV na v1; ajuste de valor só pelo desconto da venda. | Evita “desconto duplo” e mantém o rateio simples. | Claude |
| 015 | 30/10/2026 | Imagem construída no GitHub Actions e publicada no GHCR; Portainer puxa a tag. | Build reprodutível; VPS não precisa compilar. Alternativa documentada. | Claude |

| 016 | 30/10/2026 | **Front-end adiado.** Etapas 0–10 entregam só API, regras e testes; `apps/web`, telas e PWA (Etapa 11) vêm depois, consumindo a API já tipada. | Pedido do dev: priorizar a parte funcional. | Dev |
| 017 | 30/10/2026 | Rateio do desconto: centavos que sobram vão para as linhas com **maior resto** (empate: maior subtotal). Substitui “sobra no maior item” (RN-VEN-05). | Com “sobra no maior item”, uma linha pequena podia receber desconto maior que o próprio valor (ex.: 3 linhas de R$ 0,01 e desconto de R$ 0,02). | Claude |
| 018 | 30/10/2026 | Deploy em **stack Docker Swarm** no Portainer (não compose simples). O compose de produção da Etapa 12 segue o exemplo que o dev vai enviar. | Infra existente do dev. | Dev |
| 019 | 30/10/2026 | TypeScript fixado em 6.0 e postgres.js em 3.x (não as majors mais novas). | typescript-eslint ainda não suporta TS 7; Drizzle é testado com postgres.js 3. | Claude |
| 020 | 30/10/2026 | Repositório: github.com/Fellipe-Tomasella/Sistema-Estoque, push a cada etapa. | Versionamento para poder voltar etapas. | Dev |

## Versões instaladas (Etapa 0)

| Ferramenta | Versão |
| --- | --- |
| Bun | 1.3.13 |
| Elysia | 1.4.30 |
| Drizzle ORM / drizzle-kit | 0.45.4 / 0.31.11 |
| postgres (postgres.js) | 3.4.9 |
| PostgreSQL (imagem) | 18-alpine |
| TypeScript / ESLint | 6.0.3 / 10.14.0 |
| Vue / Vite | (front adiado — decisão 016) |
| Tailwind CSS | (front adiado) |
| shadcn-vue | (front adiado) |
| vite-plugin-pwa | (front adiado) |
