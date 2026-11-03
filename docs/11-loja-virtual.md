# 11 — Loja virtual (v2) — PLANEJAMENTO

> Pedido do dev em 03/11/2026 (decisão 038). A v1 dizia “não é loja virtual” (docs/01); isto abre a v2.
> Ainda **não implementado**. Respostas do dev na §8.

## 1. Ideia

A dona já cadastra os produtos no sistema. Com um clique, ela publica um **site simples da loja**, que ela mesma
edita: quais páginas existem, o que aparece em cada uma e quais produtos entram. A cliente navega, monta o carrinho
**sem criar conta** e envia o pedido. O pedido chega no sistema e a dona fecha a venda pelo WhatsApp.
**Sem pagamento on-line por enquanto**; um gateway (Pix/cartão) entra depois, se a cliente pedir.

## 2. Endereço (URL)

O sistema é de **uma loja só** (uma dona por instalação), então o site também é um só.

- **Decidido (decisão 039):** o site fica no **mesmo endereço do sistema, num caminho com o nome da loja**:
  `estoque.hyperdynamis.com/<nome-da-loja>` (ex.: `estoque.hyperdynamis.com/bella-modas`). Sem DNS nem Traefik novos.
- A dona escolhe o nome do caminho em Configurações → Loja virtual (letras minúsculas, números e hífen). O sistema
  recusa nomes que já são telas do painel (`vender`, `vendas`, `produtos`, `api`, `assets`…).
- A API gera as páginas da loja no servidor para `/<nome-da-loja>` e `/<nome-da-loja>/...` antes do painel (SPA),
  que continua com o resto.
- **Depois:** subdomínio ou domínio próprio da marca, se a cliente quiser — só mais um `Host` no Traefik.

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

## 8. Respostas do dev (03/11/2026)

| Assunto | Decisão |
| --- | --- |
| Endereço | `estoque.hyperdynamis.com/<nome-da-loja>` (ver §2). Domínio próprio fica para depois. |
| Fotos | Até **5 fotos por produto** (quantidade varia por produto). |
| Entrega / pedido | Sem frete no site. A cliente deixa o **interesse** (carrinho + poucos dados: nome, WhatsApp, e-mail, cidade e observação) ou chama no WhatsApp; o sistema avisa a vendedora. Formulário curto. |
| Preço | Por produto, a dona define o **preço do site**, que pode ser **diferente** do preço do PDV (ex.: promoção só no site). Vazio = usa o preço do PDV. Ela também pode esconder o preço (“consulte”). O preço do site não muda a venda: ao “virar venda”, o PDV usa o preço do site como preço do item. |
| Fiado | Não aparece no site. A mensagem final diz só que “a vendedora vai entrar em contato”. Forma de pagamento se combina depois. |
| Aviso de pedido | **E-mail para a vendedora + aviso no sistema.** WhatsApp automático não (sem API oficial); só o link `wa.me` para a cliente. |
| E-mail de envio | Gmail `hyperdynamis@gmail.com` com **senha de app** (SMTP `smtp.gmail.com:587`, STARTTLS). A senha fica só no `.env` e na stack local (fora do git). Limite ~500 e-mails/dia; no começo pode cair em Spam/Promoções. Para caixa de entrada garantida, trocar depois por domínio com SPF/DKIM (Resend/Brevo). |
| Nome da loja | **Jooliv Lingeries** → caminho `estoque.hyperdynamis.com/jooliv-lingeries`. |
| Confirmação para a cliente | Se ela informar o e-mail, recebe “recebemos seu pedido” com o resumo (pode cair em Spam pelo Gmail). |
| Quem recebe | E-mail de avisos configurável em Configurações → Loja virtual; por enquanto o do dev (`fellipetomasella@gmail.com`), depois o da vendedora. |

## 9. Etapas sugeridas

1. Fotos dos produtos e dados públicos do produto (painel).
2. Configurações do site e páginas com blocos (editor + pré-visualização + publicar).
3. Site público (início, catálogo, produto, páginas) renderizado no servidor em `/<nome-da-loja>`.
4. Carrinho, finalizar pedido e Pedidos do site no painel (“virar venda” no PDV).
5. Interessados e produtos mais vistos.
6. Testes E2E do pedido e publicação em produção.
