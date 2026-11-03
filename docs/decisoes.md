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
| 021 | 30/10/2026 | Origin-check recusa escrita com `Origin` diferente de `APP_ORIGIN`; requisição sem `Origin` (scripts, ferramentas) passa — o cookie SameSite=Lax já barra o envio cross-site. Login bloqueado após 5 erros em 15 min por IP+e-mail (HTTP 429). | Navegadores sempre enviam `Origin` em POST; exigir o cabeçalho quebraria scripts sem ganho de segurança. | Claude |
| 022 | 30/10/2026 | Sem rota `/stock/overview`: `/products` (com `stock=out\|low`) já traz produto + variações + saldo + situação, e a grade é montada na tela. | Evita duas consultas com o mesmo conteúdo. | Claude |
| 023 | 30/10/2026 | Importação: o `custo` de cada linha vai para a variação; referência e categoria do produto vêm da primeira linha que as tiver. Na efetivação o plano é refeito sobre o catálogo atual; se surgiu variação igual depois da prévia, a importação pede nova prévia (409). | Planilha tem uma linha por variação; refazer o plano impede contar estoque duas vezes. | Claude |
| 024 | 30/10/2026 | Enums opcionais em query/body usam `OneOf` (união de literais), não `t.UnionEnum`. | O Elysia preenche `UnionEnum` ausente com o primeiro valor — um filtro não pedido seria aplicado. | Claude |
| 025 | 30/10/2026 | Fiado no rascunho é uma escolha (`fiado: true`), não uma linha de pagamento: o que os pagamentos não cobrem vira a dívida. O id de cada pagamento do rascunho é gerado pelo front e vira o `id` em `payments`. | Bate com a tela (“o restante vira fiado se a dona escolher Fiado”) e mantém a confirmação idempotente. | Claude |
| 026 | 30/10/2026 | Na confirmação, preço e situação (ativo) das variações são lidos de novo com as variações travadas; se algo saiu de venda ou falta saldo, nada é gravado. | RN-PRO-06 (rascunho acompanha o cadastro) e RN-VEN-07. | Claude |
| 027 | 30/10/2026 | Todo cancelamento cria um registro `returns` tipo `cancellation` com as peças ainda não devolvidas — recebidas na hora (com a loja, movimento `sale_cancel_return`) ou aguardando (com a cliente). `sale_items.returned_qty` soma essas peças. | Um só caminho para retorno físico (RN-DEV-07), mantém o invariante 4 e impede cancelar duas vezes as mesmas peças. | Claude |
| 028 | 30/10/2026 | Dívida zerada por cancelamento fica `cancelled`; por devolução de peças, `settled`. A situação de pagamento de venda cancelada não muda. | O histórico mostra se a dívida foi paga ou cancelada; a venda cancelada guarda como estava. | Claude |
| 029 | 30/10/2026 | A venda da troca é da mesma cliente da venda original, sem desconto próprio; o crédito é o valor das peças devolvidas até o total dela. Se a venda nova for bloqueada (pagamento faltando, estoque), nada da troca é gravado. | RN-DEV-05/06 numa transação única; desconto na troca não foi pedido. | Claude |
| 030 | 30/10/2026 | Fechamento: venda confirmada e cancelada no mesmo dia não soma nas vendas do dia (aparece só nos cancelamentos); o pagamento dela continua nos recebimentos do dia em que entrou. Relatórios recebem o período como `from`/`to`; os atalhos (hoje, semana…) ficam na tela. | RN-CAN-06/09 e RN-FEC-01/02. | Claude |
| 031 | 30/10/2026 | Front segue os modelos do Stitch (`design/stitch`) como referência de estilo, não como especificação: o que aparece lá fora do escopo (curva ABC, giro, margem, ticket médio, condicional, abertura de caixa, fotos, WhatsApp) não entra; tela que faltar é criada no mesmo padrão. | Pedido do dev. | Dev |
| 032 | 30/10/2026 | Layout persistente: `AppLayout` (barra lateral, cabeçalho, barra inferior do celular) montado uma vez e as telas como rotas filhas carregadas sob demanda. Bibliotecas prontas sempre que possível: shadcn-vue/Reka UI, vee-validate + zod 3, TanStack Query/Table, VueUse, vue-sonner, vite-plugin-pwa. | Pedido do dev: não recriar menu por página e usar frameworks. | Dev |
| 033 | 30/10/2026 | Eden Treaty com `parseDate: false`: datas chegam como texto e `lib/format` decide se é dia da loja (AAAA-MM-DD) ou instante. Ícones em `@lucide/vue` (nome novo do pacote); zod fixado em 3 (a ponte do vee-validate não suporta o 4). | O Eden transformava `business_date` em meia-noite UTC, mostrando o dia anterior no fuso da loja. | Claude |
| 034 | 30/10/2026 | PWA com `registerType: 'prompt'`: o service worker guarda só o app (HTML/JS/CSS/ícones), `/api` fora do cache e do fallback de navegação; nova versão aparece como aviso “Atualizar” em vez de recarregar sozinha. Ícones gerados de `public/icon.svg` com `@vite-pwa/assets-generator`. | Não recarregar no meio de uma venda; sem dados velhos de API (06 §5, decisão 006). | Claude |
| 035 | 30/10/2026 | A imagem de produção roda o TypeScript da API direto com o Bun (sem bundle em `dist/`); a API serve o build do Vue quando `PUBLIC_DIR` está definida (cache longo em `/assets`, `no-cache` no resto, `/api` inexistente continua 404 JSON). Scripts no container: `bun apps/api/src/scripts/<nome>.ts`. E2E (Playwright) sobe API (3100, `NODE_ENV=test`) e Vite (5174) próprios sobre o banco de teste. | Menos peças móveis (o bundle quebrava dependências dinâmicas como o pdfmake) e o E2E nunca toca no banco de desenvolvimento. | Claude |
| 036 | 02/11/2026 | Produção em **Docker Swarm + Traefik** (rede externa `HDSwarmNet`, `letsencryptresolver`), no mesmo padrão da stack Nexus do dev: `deploy/estoque-stack.yml` é um modelo com `TROQUE_*` (a cópia preenchida não vai para o git); banco só na rede overlay interna; backup é um serviço `postgres:18-alpine` com o roteiro embutido no compose. O IP do cliente vem de `CLIENT_IP_HEADER` (padrão `x-real-ip`; `cf-connecting-ip` atrás do Cloudflare). Sai o exemplo de Nginx. | Exemplo de stack enviado pelo dev; o Portainer não tem acesso à pasta do repositório para montar `backup.sh`. | Dev |
| 037 | 02/11/2026 | Primeira conta pelo deploy: `FIRST_USER_NAME/EMAIL/PASSWORD` criam a conta da dona ao subir a API, só se o banco não tem nenhuma conta (restart não desfaz troca de senha). Imagem no GHCR com pacote público para o Swarm baixar sem registry no Portainer. | Pedido do dev: tudo no compose, sem cadastrar registry nem usar o console. | Dev |

## Versões instaladas (Etapa 0)

| Ferramenta | Versão |
| --- | --- |
| Bun | 1.3.13 |
| Elysia | 1.4.30 |
| Drizzle ORM / drizzle-kit | 0.45.4 / 0.31.11 |
| postgres (postgres.js) | 3.4.9 |
| PostgreSQL (imagem) | 18-alpine |
| TypeScript / ESLint | 6.0.3 / 10.14.0 |
| Vue / Vite | 3.5.44 / 8.3.5 |
| Tailwind CSS | 4.3.3 |
| shadcn-vue (Reka UI) | 2.11.0 |
| vite-plugin-pwa | 2.0.0 |
