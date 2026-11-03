# 11 — Loja virtual (v2) — PLANEJAMENTO

> Pedido do dev em 03/11/2026 (decisão 038). A v1 dizia “não é loja virtual” (docs/01); isto abre a v2.
> Ainda **não implementado**. Rever as perguntas da §8 antes de começar.

## 1. Ideia

A dona já cadastra os produtos no sistema. Com um clique, ela publica um **site simples da loja**, que ela mesma
edita: quais páginas existem, o que aparece em cada uma e quais produtos entram. A cliente navega, monta o carrinho
**sem criar conta** e envia o pedido. O pedido chega no sistema e a dona fecha a venda pelo WhatsApp.
**Sem pagamento on-line por enquanto**; um gateway (Pix/cartão) entra depois, se a cliente pedir.

## 2. Endereço (URL)

O sistema é de **uma loja só** (uma dona por instalação), então o site também é um só. Não precisa de subdomínio
curinga nem de um site por pessoa.

- **Recomendado:** um subdomínio com o nome da marca, ex.: `nomedamarca.hyperdynamis.com`. Configuração: um CNAME na
  Cloudflare (igual ao `estoque`) e mais uma regra `Host(...)` no Traefik apontando para o **mesmo serviço**.
  A API vê o `Host` da requisição: no `estoque.` mostra o painel; no da marca, mostra a loja.
- **Depois:** domínio próprio da marca (`nomedamarca.com.br`) do mesmo jeito: só mais um `Host` no Traefik.
- Configurações → Loja virtual guarda o endereço público (usado em links, compartilhamento e e-mails).

## 2.1 Fotos dos produtos (painel e site)

Pedido do dev: as fotos servem **para o catálogo interno e para o site**, não só para o site.
- Upload no cadastro/edição do produto (várias fotos, arrastar para ordenar, escolher a capa); foto opcional por cor.
- No painel: miniatura na lista de produtos, no detalhe, na busca do PDV, nos cards do catálogo do PDV e no
  comprovante (opcional).
- No site: galeria do produto e vitrines. Uma foto pode ficar só interna (“não mostrar no site”).
- Servidor gera miniatura e tamanho grande (WebP), limite de tamanho por arquivo, e as fotos entram no backup.

## 3. O que a dona edita (painel)

- **Aparência:** logo, cor principal, nome, frase de apresentação, redes sociais, WhatsApp de atendimento.
- **Páginas:** Início, Catálogo, Sobre, Contato e páginas livres; ligar/desligar, ordenar, renomear.
- **Blocos por página** (lista que se reordena): banner com imagem e texto, texto livre, vitrine de produtos
  (por categoria, seleção manual, novidades ou mais vendidos), perguntas frequentes, contato/WhatsApp.
- **Produtos:** “mostrar no site” por produto; descrição pública; fotos; o que exibir (preço, tamanhos disponíveis,
  aviso “últimas peças”). Sem estoque, o item fica “esgotado” ou some, conforme a dona escolher.
- **Pré-visualizar** antes de **publicar**. O site só muda quando ela publica.

## 4. O que a cliente faz (site público)

1. Vê vitrines e catálogo (filtro por categoria, cor e tamanho) e abre o produto (fotos, tamanhos com saldo).
2. Adiciona ao carrinho (guardado no navegador) e vai para **Finalizar pedido**: nome, WhatsApp, e-mail opcional,
   entrega (retirada ou endereço), observação e aceite da política de privacidade.
3. Recebe a confirmação “pedido recebido” e um botão **“Falar no WhatsApp”** com o resumo já escrito.

## 5. O pedido no sistema

- Novo registro **Pedido do site**: aparece em Pendências e no Início, com aviso.
- **Não baixa estoque** ao chegar (evita estoque preso por pedido abandonado). A dona confere e clica **“Virar venda”**:
  o pedido abre no PDV como rascunho (cliente cadastrada ou criada na hora, itens, envio) e segue o fluxo normal de
  confirmação, pagamento e fiado. Ela também pode recusar o pedido, com motivo.
- Se uma peça acabou entre o pedido e a confirmação, o PDV avisa (regra existente).

## 6. Interessados (CRM simples)

- **Contatos do site:** quem enviou pedido ou deixou o WhatsApp (“avise quando chegar”, “quero saber mais”), com o
  que pediu e quando. Botão para chamar no WhatsApp e transformar em cliente.
- **Carrinhos não enviados:** só quando a pessoa já informou o contato na finalização (com consentimento).
- **Produtos mais vistos** no site (contagem anônima, sem rastrear a pessoa).
- LGPD: página de política de privacidade, aceite no envio, sem cookies de rastreio de terceiros.

## 7. Técnica (proposta)

- **Mesma imagem e mesmo banco.** Páginas públicas geradas no servidor (HTML pronto: abre rápido, aparece no Google e
  mostra a prévia com foto quando o link é compartilhado no WhatsApp). O editor fica no painel em Vue.
- **Fotos:** upload no painel, redimensionadas no servidor (miniatura e tamanho grande), guardadas em volume próprio
  (`estoque_media`) e incluídas no backup. A v1 tinha deixado foto de fora (decisões 031 e “Depois da v1”).
- **Rotas públicas** sem login, com limite de envio de pedidos por IP e proteção contra robôs (campo isca + tempo).
- **Novas tabelas** (rascunho): `storefront_settings`, `storefront_pages` (com blocos em JSON, versão rascunho e
  publicada), `product_images`, `product_public` (descrição e visibilidade), `web_orders` + `web_order_items`,
  `web_leads`, `product_view_counts` (por dia).
- Pagamento on-line **fora** desta etapa; deixar o pedido com campo de forma pretendida para o gateway no futuro.

## 8. Perguntas antes de começar

1. **Nome da marca** para o endereço (`marca.hyperdynamis.com`)? Já existe domínio próprio?
2. **Fotos:** a dona tem fotos dos produtos? Quantas por produto?
3. **Entrega no site:** só retirada e “combinar no WhatsApp”, ou frete fixo por região?
4. Mostrar **preço** sempre, ou “consulte” em alguns produtos?
5. O pedido do site pode virar **fiado**, ou fiado só para clientes já conhecidas?
6. Notificação de pedido novo: só no sistema, também por e-mail, ou WhatsApp para a dona (via link)?

## 9. Etapas sugeridas

1. Fotos dos produtos e dados públicos do produto (painel).
2. Configurações do site e páginas com blocos (editor + pré-visualização + publicar).
3. Site público (início, catálogo, produto, páginas) renderizado no servidor + Host da marca.
4. Carrinho, finalizar pedido e Pedidos do site no painel (“virar venda” no PDV).
5. Interessados e produtos mais vistos.
6. Domínio da marca em produção (CNAME + Traefik) e testes E2E do pedido.
