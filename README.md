# Sistema de Estoque, Vendas e Fiado

Painel web (com PWA) para uma loja on-line de roupas: produtos com cor/tamanho, estoque, PDV, dinheiro/Pix/cartão/fiado,
cancelamentos, devoluções e trocas, relatórios e fechamento diário. Empresa MEI.

## Operação básica (dev)

Pré-requisitos: Bun 1.3, PostgreSQL 18 (instalado ou `bun run db:up`) com os bancos `estoque` e `estoque_test`
(role/senha `estoque`), Docker só para gerar a imagem.

```bash
cp .env.example .env        # primeira vez
bun install
bun run db:migrate          # aplica as migrations
bun run db:seed             # dados de exemplo — entre com dona@loja.dev / senha-dev-123
bun run dev                 # API em :3000 e front em http://localhost:5173
```

| Tarefa | Comando |
| --- | --- |
| Lint e tipos | `bun run lint && bun run typecheck` |
| Testes de regra (API, banco de teste) | `bun run test` |
| E2E A1–A10 (Playwright, banco de teste) | `bunx playwright install chromium` (1ª vez) e `bun run test:e2e` |
| Build do front | `bun run build` |
| Imagem de produção | `docker build -f docker/Dockerfile -t sistema-estoque .` |
| Criar usuária | `cd apps/api && bun run user:create --name "…" --email "…"` |
| Redefinir senha | `cd apps/api && bun run user:reset-password --email "…"` |
| Conferir integridade (estoque, fiado) | `cd apps/api && bun run check-integrity` |

Produção (Docker Swarm + Traefik no Portainer, backup): passo a passo em `deploy/LEIA.md`. No container, os scripts rodam com
`bun apps/api/src/scripts/<nome>.ts`. Publicar versão: criar uma tag `vX.Y.Z` — o GitHub Actions envia a imagem ao GHCR.

## Mapa dos documentos

| Arquivo | Conteúdo |
| --- | --- |
| `CLAUDE.md` | Regras de trabalho para o agente |
| `docs/00-contexto-cliente.md` | Levantamento original (não editar) |
| `docs/01-visao-e-escopo.md` | Entendimento, escopo v1, fora de escopo |
| `docs/02-arquitetura.md` | Stack, pastas, camadas, convenções |
| `docs/03-modelo-de-dados.md` | Tabelas e invariantes |
| `docs/04-regras-de-negocio.md` | Regras RN-xxx e cenários de aceite |
| `docs/05-api.md` | Rotas |
| `docs/06-telas-e-ux.md` | Telas, fluxos, PWA |
| `docs/07-fiscal-mei.md` | Fiscal do MEI e perguntas ao contador |
| `docs/08-deploy.md` | Docker, Swarm/Traefik, Portainer, backup |
| `docs/09-roadmap.md` | Etapas 0–12 com critérios de aceite |
| `docs/10-pendencias.md` | Perguntas abertas |
| `docs/decisoes.md` | Registro de decisões |
