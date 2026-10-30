# Sistema de Estoque, Vendas e Fiado

Painel web (com PWA) para uma loja on-line de roupas: produtos com cor/tamanho, estoque, PDV, dinheiro/Pix/cartão/fiado,
cancelamentos, devoluções e trocas, relatórios e fechamento diário. Empresa MEI.

## Como usar estes arquivos com o Claude Code

1. Abra esta pasta no VS Code e inicie o Claude Code no terminal integrado.
2. O `CLAUDE.md` é lido automaticamente. Comece com:

   > Leia o CLAUDE.md e todos os arquivos de docs/ na ordem indicada. Depois me diga, em poucas linhas, o que entendeu
   > e se viu alguma contradição entre os documentos. Não escreva código ainda.

3. Depois, etapa por etapa (`docs/09-roadmap.md`):

   > Vamos fazer a Etapa 0 do roadmap. Faça um plano curto, espere meu ok e implemente.

4. Quando a cliente ou o contador responderem algo de `docs/10-pendencias.md`, peça ao Claude Code para registrar em
   `docs/decisoes.md` e atualizar a regra correspondente.

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
| `docs/08-deploy.md` | Docker, Nginx, Portainer, backup |
| `docs/09-roadmap.md` | Etapas 0–12 com critérios de aceite |
| `docs/10-pendencias.md` | Perguntas abertas |
| `docs/decisoes.md` | Registro de decisões |
