# 01 — Visão e escopo

## 1. Entendimento do negócio

Loja de roupas **100% on-line** (sem loja física), tocada por **uma pessoa**. Ela vende pelos canais dela (provavelmente
WhatsApp/Instagram — não confirmado), cobra na **maquininha** ou por Pix/dinheiro, e vende **fiado** para clientes de confiança.
Tem **~500 peças físicas** (estimativa), distribuídas em modelos × cor × tamanho.

A dor principal é **organizar o estoque**: saber exatamente o que tem de cada cor e tamanho, o que precisa repor, e não
perder o controle quando vende, cancela ou troca. Logo atrás vêm: **quem me deve e quanto** (fiado) e **conferir o dia**
(fechamento).

A empresa é **MEI** (confirmado pelo desenvolvedor em 30/10/2026). Isso define a parte fiscal — ver `07-fiscal-mei.md`.

### O que o sistema é

Um **painel de gestão privado** usado pela dona, no notebook (uso principal) e no celular (consulta e operações simples).

### O que o sistema não é

Não é loja virtual, vitrine, catálogo público, app para as clientes, marketplace, ERP contábil, emissor fiscal (na v1)
ou ferramenta de metas/indicadores.

## 2. Legenda usada em todos os documentos

| Marca | Significado |
| --- | --- |
| **[C]** Confirmado | Veio da cliente ou do desenvolvedor. Implementar. |
| **[P]** Proposto | Regra criada para dar consistência. Implementar; pode ser ajustada. |
| **[D]** Decidido | Era ponto a confirmar e foi decidido em 30/10/2026 (ver `decisoes.md`). Implementar. |
| **[A]** A confirmar | Depende da cliente/contador. **Não implementar como regra fechada.** O modelo de dados pode ficar preparado. |

## 3. Escopo da versão 1

### 3.1 Núcleo solicitado [C]

| # | Módulo | Resumo |
| --- | --- | --- |
| N1 | Produtos e variações | Modelo + combinações cor/tamanho, preço por combinação opcional, busca/filtros, inativação. |
| N2 | Estoque | Saldo inicial, entradas de fornecedor, ajustes com motivo, histórico por variação, alerta mínimo por variação. |
| N3 | Baixa automática | Venda confirmada baixa estoque (inclusive fiado). Rascunho não baixa. |
| N4 | Aviso de estoque baixo | Dentro do sistema (início + filtro na lista). |
| N5 | PDV (Nova venda) | Busca, carrinho, desconto (R$ ou %), pagamentos, confirmação. |
| N6 | Comprovante e histórico | PDF/impressão “Comprovante de venda — não é documento fiscal”; histórico com filtros. |
| N7 | Cancelamento | Prévia dos efeitos, estoque, fiado, valores a devolver, retorno físico pendente. |
| N8 | Clientes e fiado | Cadastro simples, dívidas por venda, recebimentos parciais com alocação explícita, estorno de recebimento. |
| N9 | Relatórios | Vendas por período, fiado em aberto, mais/menos vendidos, fechamento diário. |
| N10 | Web responsivo | Notebook + celular. |
| N11 | Fiscal | Tratamento conforme MEI: classificação PF/PJ da venda, pendências de NF, registro da nota emitida fora. |

### 3.2 Complementos incluídos na v1 [D]

Decididos pelo desenvolvedor em 30/10/2026:

| # | Complemento | Observação |
| --- | --- | --- |
| C1 | **Entrada + resto no fiado** | Parte paga na hora, restante vira dívida. Cliente obrigatório. |
| C2 | **Controle de envio simples** | Endereço de entrega e situação (sem envio / aguardando envio / enviado / entregue), código de rastreio opcional em texto. Sem cálculo de frete, sem transportadora integrada. |
| C3 | **Importar planilha inicial** | CSV/XLSX com modelo, cor, tamanho, preço, quantidade. Prévia e conferência antes de gravar. |
| C4 | **Devolução parcial e troca** | Devolver parte da compra; trocar por outra peça. Sem vale-troca/crédito guardado (não confirmado). |
| C5 | **PWA instalável** | Adicionar à tela inicial. **Sem** operação off-line. |

### 3.3 Complementos pequenos e baratos incluídos [P]

Entram porque o modelo já precisa deles e não pesam no cadastro (todos opcionais na tela):

- Referência interna, categoria e preço de custo do produto (campos opcionais).
- Fornecedor, referência da compra e custo unitário na entrada (opcionais).
- Data combinada de pagamento no fiado (opcional) — habilita “em atraso”.
- Exportação de dados (CSV em ZIP) — atende a “obter cópia dos cadastros”.
- Comprovante de recebimento de fiado.

### 3.4 Preparado no banco, mas fora da v1 [A]

| Item | Por quê fica fora | Preparação |
| --- | --- | --- |
| Fiado anterior (saldo inicial de dívidas) | Não confirmado se existe. **Custo baixo** — se a cliente confirmar, entra na Etapa 6 sem mudar o banco. | `receivables.origin = 'previous_balance'`, `sale_id` nulo. |
| Canal de venda (WhatsApp/Instagram/…) | Não confirmado. | Coluna `sales.channel` nullable, sem tela. |
| Taxa de entrega/frete cobrado | Não confirmado. | Não criar coluna ainda. |
| Reserva de peças | Não confirmado. Rascunho **não** reserva. | Nada. Se vier, exige `reserved_qty`. |
| Saldo de abertura/retiradas do caixa | Não confirmado. | Nada além do “dinheiro contado” no fechamento. |
| Parcelamento no cartão | Não confirmado. | `payments.card_installments` informativo, opcional. |
| Foto do produto | Exige armazenamento de arquivos. | Nada. |
| Emissão de NF integrada (API de emissor) | Depende do contador e do volume de vendas para PJ. | Tabela `fiscal_documents` já existe para registro manual. |

### 3.5 Fora de escopo (não fazer sem pedido)

Multiusuário, múltiplas lojas/estoques, vitrine, app de clientes, metas/KPIs, cobrança automática, juros/multa, limite
de crédito, integração com maquininha, bancos, WhatsApp, Instagram, transportadoras, conciliação bancária, contas a pagar,
taxas da maquininha, despesas.

## 4. Usuária e contexto de uso

- **1 usuária** (a dona). O banco tem tabela `users` para não travar o futuro, mas não há tela de gestão de usuários.
- Notebook: cadastro, entradas, PDV, cancelamentos, relatórios.
- Celular: “tem a blusa preta M?”, “quanto a Fulana deve?”, registrar um recebimento de fiado, mudar envio para “enviado”,
  consultar vendas do dia. O PDV também funciona no celular, mas é otimizado para o notebook.
- Estoque estimado em ~500 unidades → volume pequeno. Não há requisito de performance especial, mas **não** limitar cadastro.

## 5. Princípios de produto

1. **Poucos campos obrigatórios.** Nome, cor, tamanho, preço e quantidade. O resto é opcional.
2. **Toda ação que mexe em estoque ou dinheiro mostra o que vai acontecer antes** (prévia) e **confirma que salvou** depois.
3. **Nada some.** Cancelado, estornado e inativado continuam consultáveis.
4. **Linguagem da dona**: “fiado”, “em aberto”, “recebimento”, “entrada de mercadoria”, “acerto de estoque”.
5. **Sem jargão fiscal enganoso**: comprovante é comprovante; nota é nota.
