# 12 — Referência: Nuvemshop (engenharia reversa do admin)

> Feito em 03/11/2026, a pedido do dev, na loja de teste `fellipeteste.lojavirtualnuvem.com.br` (vazia), só
> olhando telas e formulários (nada salvo). Objetivo: **inspiração**, não cópia. O que entra no nosso sistema
> passa pelo dev e vira decisão em `decisoes.md` (regra 10 do CLAUDE.md).
>
> Legenda da evidência: **[visto]** = texto/campo lido na tela; **[deduzido]** = inferido do nome ou do fluxo.

## 1. Mapa do admin [visto]

- **Gestão:** Vendas · Produtos (Lista, Inventário, Categorias, Assinaturas, Tabelas de preços) · Nuvem Pago ·
  Nuvem Envio · Clientes · Descontos (cupons) · Marketing.
- **Canais de venda:** Loja online (layout) · Ponto de Venda · Chat · Instagram/Facebook · Google Shopping ·
  ChatGPT Ads · TikTok · Pinterest · Marketplaces.
- **Configurações:** meios de pagamento e de envio · centros de distribuição · NF-e e DC-e · informação de contato ·
  botão de WhatsApp · e-mails automáticos · opções de checkout · mensagem para clientes · usuários e perfis ·
  domínios · códigos externos · idiomas e moedas · redirecionamentos 301 · campos personalizados.
- **Estatísticas:** visitas únicas, vendas, receita, ticket médio, conversão do carrinho, cada um contra o
  “mesmo período anterior”; funil “visitas → carrinhos → checkout → pedidos pagos”.

## 2. Cadastro de produto [visto]

Nome e descrição · fotos (arrastar) + link de vídeo (YouTube/Vimeo) · **preço de venda + preço promocional** ·
“mostrar na loja” · **calcular margem de lucro** (custo) · físico/digital · peso e dimensões (frete) ·
**SKU e código de barras (GTIN)** · variações por propriedades (cor, tamanho…) · inventário **infinito ou limitado** ·
categorias · **destaque na loja** (em quais seções aparece) · **tags** e marca · **SEO** (título 70, descrição 160,
URL curta) · Instagram/Google Shopping (MPN, faixa etária, gênero) · nota fiscal (origem, produção própria/revenda,
NCM, CEST) · **visibilidade: visível / não listado (só por link) / oculto** · frete grátis por produto.

## 3. Outras telas [visto]

- **Cupom:** código + **link que já aplica o cupom** · tipo: % / valor fixo / frete grátis · aplicar em toda a loja,
  categorias ou produtos · combinar com outras promoções · limite por cupom, por cliente, **só primeira compra** ·
  período · valor mínimo do carrinho · desconto máximo.
- **Cliente:** nome, e-mail, telefone, CPF/CNPJ, endereço de entrega · **importar clientes**.
- **Vendas:** “criar um pedido” manual (venda da loja física ou de rede social).
- **E-mails automáticos:** confirmação de compra, de pagamento, pronto para retirada, **envio (com rastreio)**,
  entrega, cancelamento, nota fiscal; conta da cliente; carrinho abandonado (app pago).
- **Opções do checkout:** pedir telefone · pedir endereço para nota · **campo de mensagem da cliente com nome
  configurável e obrigatório opcional** · mensagem na página de acompanhamento · restringir compras a clientes
  autorizados · deixar trocar o meio de pagamento depois.
- **Mensagem para clientes:** aviso exibido antes de finalizar a compra.
- **Botão de WhatsApp:** número da loja → botão flutuante no site [deduzido].
- **Editor do site (layout):** seções agrupadas em Cabeçalho / página / Rodapé, com prévia ao lado, troca
  celular↔computador, desfazer/refazer, **rascunhos (até 2) e “Salvar e publicar”**. Seções disponíveis:
  Hero, Hero dividido, Carrossel (slides), Banners, Vídeo, Produtos em destaque, Categorias em destaque,
  Produto principal, Editorial de texto / imagem e texto / vídeo e texto, Ícones informativos, Marcas em destaque,
  Depoimentos, Newsletter, Perguntas frequentes, Ofertas com temporizador, Posts do blog, Personalizada,
  Publicações do Instagram, Separador. **Identidade da marca:** cores, tipo de letra, botões, etiquetas, largura.
  Avançado: aba do navegador, **pop-up promocional**, cartão de produto, formulário de produto, carrinho, CSS.

## 4. Comparação com o nosso sistema

| Recurso Nuvemshop | Nós hoje | Proposta |
| --- | --- | --- |
| Preço promocional (de/por) | Preço do site ≠ PDV | **Aproveitar**: “preço promocional” com o antigo riscado no site (e opcional no PDV). |
| Visível / não listado / oculto | Mostrar no site sim/não | **Aproveitar**: 3 estados (não listado = só pelo link, bom para mandar no WhatsApp). |
| Código de barras por variação | SKU | **Aproveitar**: GTIN/código na variação + busca no PDV por leitor (o leitor “digita” e dá Enter). |
| Destaque na loja / categorias em destaque | Categoria simples | **Aproveitar** no editor: vitrines “Destaques”, “Novidades”, “Promoções” e por categoria. |
| Editor por seções com publicar | Configurações do site (sem blocos) | **Aproveitar** (já era a etapa “Editor de páginas e blocos”): Hero/Carrossel, Banners, Vitrine, Categorias, Texto, Imagem+texto, Ícones (troca/entrega), Depoimentos, Perguntas frequentes, Newsletter/“avise-me” (vira Interessados), Separador. Rascunho + publicar, prévia celular/computador. |
| Botão de WhatsApp flutuante | Botão no topo | **Aproveitar** (pequeno). |
| Opções do checkout / mensagem antes de finalizar | Formulário fixo | **Aproveitar**: aviso configurável + campo de observação com nome e obrigatoriedade configuráveis. |
| E-mails automáticos (compra, envio com rastreio, cancelamento) | Só pedido do site e senha | **Aproveitar parte**: e-mail da venda confirmada e do envio com código de rastreio (já temos o rastreio), se a cliente tiver e-mail. |
| Cupons | Desconto manual no PDV | **Avaliar**: cupom com código (%, valor), período, limite, valor mínimo; usado no PDV e no site. |
| Importar clientes | Importa produtos | **Avaliar**: importar clientes por planilha (mesmo esquema da importação de produtos). |
| SEO (título, descrição, URL), tags | Título/descrição automáticos | **Avaliar**: SEO por produto e busca no site por tags. |
| Margem de lucro | Custo guardado | **Precisa de ok**: margem estava fora (decisão 031). Só um cálculo no cadastro, sem relatório? |
| Estatísticas (ticket médio, conversão) | Relatórios simples | **Precisa de ok**: KPIs estão fora (regra 10). Dá para ter só “mais vistos” e funil do site, já previstos. |
| Pop-up promocional, ofertas com temporizador | — | Depois, se a cliente pedir. |
| Inventário infinito, centros de distribuição, tabelas de preço (atacado), assinaturas, multiusuário, marketplaces, Instagram/Google Shopping, NF-e integrada, frete por peso | — | **Fora** (uma loja, uma pessoa, MEI; regra 10). |

## 5. O que já estava pendente (antes desta análise)

- Loja virtual: **sacola e “Finalizar pedido” no site**, **tela “Pedidos do site” no painel** (a API já existe),
  editor de páginas e blocos, interessados e mais vistos, E2E do pedido, publicar a v2 em produção.
- v1: cópia do backup para fora da VPS, teste de restauração em produção, teste de instalação num celular real.
