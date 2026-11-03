# 04 — Regras de negócio

Cada regra tem ID, origem e **deve ter teste** com o ID no nome.
Origem: **[C]** confirmado · **[P]** proposto · **[D]** decidido em 30/10/2026 · **[A]** a confirmar (não implementar como regra fechada).

---

## RN-PRO — Produtos e variações

| ID | Regra | Origem |
| --- | --- | --- |
| RN-PRO-01 | Produto (modelo) tem nome e preço base. Precisa de **pelo menos 1 variação** para ser salvo. | C/P |
| RN-PRO-02 | Variação = cor + tamanho. Dentro do mesmo produto não pode haver duas variações com a mesma cor e tamanho (comparação sem diferenciar maiúsculas e ignorando espaços nas pontas). | P |
| RN-PRO-03 | Só se cadastram as combinações que existem. A tela oferece “gerar combinações” (escolher cores × tamanhos) com desmarcar individual, mas nada é obrigatório. | C |
| RN-PRO-04 | Tamanho é texto livre (letras, números ou “U”). A ordem de exibição segue `shared/sizes.ts` (PP, P, M, G, GG, XG, XGG…; 34, 36, 38…; U por último; desconhecidos em ordem alfabética). | C/P |
| RN-PRO-05 | Preço da variação é opcional; vazio = usa o preço base do produto. | C |
| RN-PRO-06 | Mudar nome ou preço **não altera vendas confirmadas** (itens guardam nome, variação e preço do momento da confirmação). Rascunhos usam o preço atual até serem confirmados. | C/P |
| RN-PRO-07 | Inativar produto ou variação: some do PDV e das listas padrão, continua no histórico e nos relatórios; pode ser reativado. Inativar produto inativa a venda de todas as variações. | C |
| RN-PRO-08 | Excluir só é permitido se o produto/variação **nunca** teve movimento de estoque nem item de venda (cadastro errado). Caso contrário, só inativar. | P |
| RN-PRO-09 | Corrigir cor/tamanho de uma variação com histórico é permitido (erro de digitação), com registro no `audit_log`; vendas antigas mantêm o rótulo antigo. Não pode colidir com outra variação (RN-PRO-02). | P |
| RN-PRO-10 | Busca por nome sem diferenciar acentos/maiúsculas; filtros por cor, tamanho, categoria, situação (ativo/inativo), estoque (sem estoque / repor). | C |
| RN-PRO-11 | Referência, categoria, custo e descrição são opcionais e nunca bloqueiam o cadastro. | C |
| RN-PRO-12 | Produto tem **até 5 fotos** (opcionais). O servidor aceita JPG, PNG ou WebP, corrige a orientação da câmera e guarda só miniatura (400 px) e tamanho grande (1600 px) em WebP, sem metadados. | P |
| RN-PRO-13 | A primeira foto é a **capa** (lista de produtos, PDV, site). A dona reordena as fotos; excluir uma refaz a ordem. Foto não é registro financeiro: excluir apaga o arquivo. | P |
| RN-PRO-14 | Uma foto pode ser de uma **cor** do produto: a busca e o catálogo do PDV mostram a foto da cor da variação e, sem ela, a capa. Cada foto pode ficar fora do site (“só interna”). | P |

## RN-EST — Estoque

| ID | Regra | Origem |
| --- | --- | --- |
| RN-EST-01 | O saldo só muda pelo `StockService`, que na **mesma transação** grava `stock_movements` (com `balance_after`) e atualiza `variants.stock_qty`. | P |
| RN-EST-02 | **Saldo inicial**: informado na criação da variação (ou importação). Gera movimento `initial`. Depois que a variação tem qualquer movimento, o campo some; usa-se entrada ou acerto. | C/P |
| RN-EST-03 | **Entrada de mercadoria**: data (padrão hoje, pode ser passada, não futura), 1+ itens (variação + quantidade > 0), fornecedor/referência/custo/observação opcionais. Gera movimento `purchase_entry` por item com `business_date = entry_date`. | C |
| RN-EST-04 | Entrada lançada não é editada nem apagada. Erro em entrada se corrige com **acerto** (motivo “erro”), referenciando a entrada na observação. | P |
| RN-EST-05 | **Acerto por contagem** define o saldo: a dona informa quanto contou; o sistema grava `delta = contado − atual` e `counted_qty`. Se `delta = 0`, nada é gravado e aparece “O saldo já está correto”. Contar 5 com saldo 3 resulta em saldo 5 (não 8). | C |
| RN-EST-06 | **Acerto por perda, avaria, erro ou outro**: a dona informa a quantidade a tirar ou acrescentar; motivo obrigatório; observação obrigatória quando o motivo for “outro”. | C |
| RN-EST-07 | O saldo nunca fica negativo (CHECK no banco + validação com mensagem clara). | P |
| RN-EST-08 | **Alerta de reposição** por variação: `min_stock` opcional, sem valor padrão. Alerta quando `stock_qty ≤ min_stock`. “Sem estoque” quando `stock_qty = 0`, com ou sem mínimo. Só variações ativas. Aviso apenas dentro do sistema. | C |
| RN-EST-09 | Definir o mínimo para todas as variações de um produto de uma vez (e editar individualmente). | P |
| RN-EST-10 | Histórico por variação: data, tipo, quantidade (+/−), saldo depois, motivo, referência clicável (entrada, venda #, devolução, importação). | C |
| RN-EST-11 | Consulta de estoque em grade **produto × cor × tamanho**, com destaque para “sem estoque” e “repor”. | C |

## RN-IMP — Importação da planilha inicial [D]

| ID | Regra |
| --- | --- |
| RN-IMP-01 | Aceita `.xlsx` e `.csv` (separador `;` ou `,`, UTF-8). Modelo para download com colunas: `produto*`, `cor*`, `tamanho*`, `preco*`, `quantidade*`, `alerta_minimo`, `referencia`, `categoria`, `custo`. (* obrigatória) |
| RN-IMP-02 | Etapa 1 — **prévia**: nada é gravado no estoque. Mostra produtos que serão criados, variações, total de unidades e **erros por linha** (preço inválido, quantidade negativa, campo vazio, linha duplicada no arquivo). |
| RN-IMP-03 | Linhas com o mesmo `produto` (sem diferenciar maiúsculas/acentos) viram um produto. Preço base = preço mais frequente; variações com preço diferente recebem preço próprio. |
| RN-IMP-04 | Produto que já existe no sistema recebe as novas variações. **Variação que já existe gera erro** (“já cadastrada — use entrada ou acerto”), para não contar estoque duas vezes. |
| RN-IMP-05 | Etapa 2 — **efetivar**: só se não houver erros (ou a dona optar por ignorar as linhas com erro, que são listadas). Tudo numa transação; movimentos `initial` com `ref_type = 'import'`. Repetir “efetivar” no mesmo lote devolve o resultado já gravado. |
| RN-IMP-06 | Limite técnico de 5.000 linhas por arquivo (proteção), muito acima do volume da loja. |

## RN-CLI — Clientes

| ID | Regra | Origem |
| --- | --- | --- |
| RN-CLI-01 | Cadastro mínimo: nome. Telefone, e-mail, observações, CPF/CNPJ e endereço são opcionais. | C |
| RN-CLI-02 | Homônimos são permitidos; listas e buscas sempre mostram nome + telefone (ou outro dado) para diferenciar. Dívidas são sempre ligadas ao `customer_id`, nunca ao nome. | C |
| RN-CLI-03 | CPF/CNPJ validados (dígitos verificadores) quando informados; não pode repetir entre clientes. | P |
| RN-CLI-04 | Cadastro rápido de cliente dentro do PDV (nome + telefone) sem sair da venda. | P |
| RN-CLI-05 | Cliente com histórico não é excluído, só inativado. | P |

## RN-VEN — Vendas (PDV)

| ID | Regra | Origem |
| --- | --- | --- |
| RN-VEN-01 | A venda nasce como **rascunho** no servidor (aparece no notebook e no celular). Rascunho **não** mexe no estoque e **não** reserva peças. | C |
| RN-VEN-02 | Adicionar ao carrinho: escolher produto → cor → tamanho → quantidade. Só variações ativas. Mostra o saldo atual; avisa se a quantidade passa do saldo, mas a checagem que vale é na confirmação. Mesma variação adicionada de novo soma na linha existente. | C |
| RN-VEN-03 | No rascunho é possível alterar quantidades e remover itens. O preço unitário vem do cadastro (não é editável na v1 — ajuste de valor é pelo desconto). | C/P |
| RN-VEN-04 | **Desconto** único por venda, em R$ ou %. Ao trocar o tipo/valor, o desconto anterior é **substituído** (nunca somado). Percentual arredonda para o centavo (meio para cima). Desconto não pode passar do subtotal (total ≥ 0). | C |
| RN-VEN-05 | Na confirmação, o desconto é rateado entre os itens proporcionalmente ao subtotal de cada linha (`shared/money.allocateDiscount`, centavos que sobram vão para as linhas de maior resto — decisão 017). Esse rateio define o valor de cada peça em devoluções. | P |
| RN-VEN-06 | **Confirmar** exige: carrinho não vazio; soma dos pagamentos + fiado = total; todo Pix/cartão marcado como **confirmado** pela dona; cliente vinculado se houver fiado. Enquanto algo faltar, o botão mostra o motivo (“Confirme que o Pix foi recebido”) e a venda continua rascunho. | C |
| RN-VEN-07 | Na confirmação, numa transação: trava a venda; trava as variações (ordem por id); confere **de novo** o saldo e se a variação continua ativa; se faltar estoque, nada é gravado e a mensagem diz qual item e quanto há; senão: atribui número, congela nomes/preços, rateia desconto, baixa estoque (movimentos `sale`), grava pagamentos, cria a dívida (fiado), define `buyer_type`, `fiscal_requirement`, `payment_status`, `business_date`. | C |
| RN-VEN-08 | **Idempotência**: confirmar uma venda já confirmada devolve a mesma venda (`alreadyProcessed: true`) sem nova baixa, pagamento ou dívida. Duas confirmações simultâneas da última unidade: só uma passa. | C |
| RN-VEN-09 | Rascunho pode ser descartado (é o único registro que pode ser apagado: não tem efeito financeiro nem de estoque). Lista “Rascunhos” no PDV para retomar. | P |
| RN-VEN-10 | Edição do rascunho usa `version`; se outro aparelho alterou antes, retorna 409 com mensagem para recarregar. | P |
| RN-VEN-11 | Venda confirmada **não tem itens nem valores editados**. Correções: cancelamento (RN-CAN), devolução/troca (RN-DEV), troca da forma de pagamento (RN-PAG-05), envio (RN-ENV), observações (livre). | C/P |
| RN-VEN-12 | Situação da venda (`draft/confirmed/cancelled`), do pagamento (`paid/partially_paid/unpaid`) e do envio (`none/pending/shipped/delivered`) são independentes e aparecem separadas. | C |
| RN-VEN-13 | Histórico de vendas: filtros por período, cliente, situação, forma de pagamento, envio; busca por número. | C |
| RN-VEN-14 | **Comprovante de venda** (PDF e tela de impressão): dados da loja, número, data/hora, cliente (se houver), itens com variação, quantidades, preços, desconto, total, pagamentos por forma, **valor pago e saldo em aberto** se houver fiado, situação “CANCELADA” se for o caso, e o aviso fixo **“Comprovante de venda — não é documento fiscal.”** Nunca mostra “quitado” com saldo > 0. Compartilhamento é manual (baixar/compartilhar pelo navegador). | C |

## RN-PAG — Pagamentos

| ID | Regra | Origem |
| --- | --- | --- |
| RN-PAG-01 | Formas: **dinheiro, Pix, cartão** e **fiado**. Cartão pode indicar crédito/débito e parcelas (informativo; parcelamento **[A]**). Parcelas do cartão não têm relação com o fiado. | C |
| RN-PAG-02 | Mais de uma forma na mesma venda é permitido (ex.: Pix + dinheiro). | P |
| RN-PAG-03 | **Entrada + resto no fiado**: pagamentos cobrem parte, o restante vira dívida do cliente, com data combinada opcional. | D |
| RN-PAG-04 | Pix/cartão registrados manualmente: a dona cobra na maquininha/banco e marca “recebido/aprovado”. O sistema **não** consulta maquininha nem banco. Dinheiro vem marcado como recebido por padrão. Para dinheiro, campo opcional “valor entregue” calcula o troco (o pagamento grava só o valor da venda). | C |
| RN-PAG-05 | Forma de pagamento lançada errada numa venda confirmada pode ser **trocada** (ex.: Pix → dinheiro), com motivo e `audit_log`. O valor não muda; para mudar valor, cancelar e refazer. | P |
| RN-PAG-06 | Venda com total zero (100% de desconto) é permitida sem pagamentos. | P |

## RN-FIA — Fiado (dívidas e recebimentos)

| ID | Regra | Origem |
| --- | --- | --- |
| RN-FIA-01 | Toda dívida pertence a um cliente e, quando vem de venda, à venda de origem. | C |
| RN-FIA-02 | Por cliente: dívidas com venda de origem, data, valor original, recebimentos, ajustes (cancelamento/devolução), saldo e data combinada. | C |
| RN-FIA-03 | **“Em aberto”** = saldo > 0. **“Em atraso”** = em aberto **e** com data combinada anterior a hoje. Sem data, nunca “em atraso”. | C |
| RN-FIA-04 | **Recebimento**: data (padrão hoje), valor, forma (dinheiro, Pix, cartão), dívidas abatidas. O sistema sugere abater das mais antigas para as mais novas; a dona pode redistribuir. A tela mostra antes de salvar quanto vai para cada dívida e o saldo que fica. | C/P |
| RN-FIA-05 | A soma distribuída = valor recebido; cada parte ≤ saldo da dívida. **Valor acima do total em aberto é bloqueado** (“Crédito para compras futuras não está disponível”). | C |
| RN-FIA-06 | Recebimento não cria venda e não mexe em estoque. Pagamento parcial só reduz o saldo da dívida escolhida. Dívida com saldo 0 passa a “quitada” e continua no histórico. | C |
| RN-FIA-07 | **Estornar recebimento** lançado por engano: motivo obrigatório; o pagamento fica `voided` (não é apagado); saldos voltam; dívidas reabrem se preciso. Se o dia do recebimento já tinha fechamento salvo, o fechamento passa a mostrar “alterado depois” (RN-FEC-06). | C |
| RN-FIA-08 | Comprovante de recebimento (PDF): cliente, data, valor, forma, dívidas abatidas e saldo restante, com “não é documento fiscal”. | C |
| RN-FIA-09 | Idempotência: o front gera o `id` do recebimento ao abrir o formulário; reenvio devolve o mesmo registro. | P |
| RN-FIA-10 | Sem juros, multa, limite de crédito, análise ou cobrança automática. | C |
| RN-FIA-11 | **[A] Saldo anterior de fiado** (dívidas de antes do sistema): cliente, descrição, data, valor, data combinada. Cria dívida `origin = previous_balance` **sem venda e sem estoque**. Implementar só após a cliente confirmar (Etapa 6, item opcional). | A |

## RN-ENV — Envio simples [D]

| ID | Regra |
| --- | --- |
| RN-ENV-01 | Na venda: “tem envio?”; se sim, endereço (puxado do cliente, editável só para esta venda), UF de destino e código de rastreio opcional. Situação inicial `pending` (aguardando envio). Sem envio → `none`. |
| RN-ENV-02 | Situações: aguardando envio → enviado → entregue (pode voltar um passo com confirmação). Datas gravadas. Mudança registrada no `audit_log`. |
| RN-ENV-03 | Início mostra “aguardando envio”. Lista de vendas filtra por situação de envio. |
| RN-ENV-04 | Sem frete calculado, sem taxa de entrega **[A]**, sem integração com transportadora. |

## RN-CAN — Cancelamento de venda

| ID | Regra | Origem |
| --- | --- | --- |
| RN-CAN-01 | Só venda **confirmada** pode ser cancelada. Motivo obrigatório. | C |
| RN-CAN-02 | Antes de confirmar, a tela mostra a **prévia dos efeitos** (vinda de `GET /sales/:id/cancel-preview`): peças que voltam ao estoque, peças aguardando retorno, dívida cancelada, valor a devolver, alerta fiscal. | C |
| RN-CAN-03 | “As peças estão com você?” — padrão “sim” se envio `pending`; “não” se `shipped`/`delivered`; **sem padrão** se `none` (a dona escolhe). Considera só as quantidades ainda não devolvidas (`quantity − returned_qty`). | C/P |
| RN-CAN-04 | Peças com a loja → voltam ao estoque (movimento `sale_cancel_return`) **uma única vez**. Peças com a cliente → cria `return` tipo `cancellation` com itens `awaiting`; **não** voltam ao estoque até a dona registrar o recebimento e a condição (RN-DEV-07). A pendência aparece no Início. | C |
| RN-CAN-05 | **Valores** — o valor das peças canceladas (líquido de desconto) **primeiro abate o fiado em aberto da venda** (ajuste `sale_cancelled`); **o restante vira devolução de valor pendente** (`refunds.pending`). Exemplo: venda R$ 150 no fiado, cliente pagou R$ 50 → dívida de R$ 100 cancelada, R$ 50 a devolver. | C/P |
| RN-CAN-06 | Recebimentos já feitos **não são apagados nem estornados** pelo cancelamento: ficam no dia em que entraram. A devolução do dinheiro é outro registro (RN-DEV-08). Registrar devolução no sistema **não** faz estorno na maquininha nem no banco. | C |
| RN-CAN-07 | Cancelar de novo uma venda cancelada devolve o resultado existente (`alreadyProcessed`), sem efeito duplicado (trava + índice único dos movimentos). | C |
| RN-CAN-08 | Se todas as peças da venda já foram devolvidas/trocadas, o cancelamento é bloqueado com a explicação. | P |
| RN-CAN-09 | Venda cancelada continua no histórico e no comprovante (marcada “CANCELADA”); não soma em vendas válidas nem em mais vendidos; aparece identificada nos relatórios. | C |
| RN-CAN-10 | Se a venda tem NF registrada, o documento passa a `cancel_pending` e aparece o alerta “Cancele a nota no emissor e registre aqui”. O sistema **nunca** declara a nota cancelada sozinho. | C |

## RN-DEV — Devolução parcial, troca, retorno físico e devolução de valor [D]

| ID | Regra |
| --- | --- |
| RN-DEV-01 | A partir de uma venda confirmada: escolher itens e quantidades (até `quantity − returned_qty`; `returned_qty` já inclui peças aguardando retorno). Motivo opcional. |
| RN-DEV-02 | **Valor de cada peça devolvida** = parte proporcional do `line_total_cents` (já com desconto rateado). Fórmula sem perda de centavos: `valor(q) = round(T × (d+q)/Q) − round(T × d/Q)`, onde T = total da linha, Q = quantidade vendida, d = já devolvidas. |
| RN-DEV-03 | Para cada peça: “recebida agora” (informar condição) ou “ainda com a cliente” (fica `awaiting`). |
| RN-DEV-04 | **Devolução parcial (sem troca)**: o valor das peças **abate primeiro o fiado em aberto da venda**; o restante vira **devolução de valor pendente**. Sem vale-troca nem crédito guardado **[A]**. |
| RN-DEV-05 | **Troca**: numa única operação (uma transação) registra as peças devolvidas e uma **nova venda** com as peças entregues. O valor das peças devolvidas vira pagamento `exchange_credit` da nova venda (até o total dela). Se a nova venda custa mais, a diferença é paga normalmente (qualquer forma, inclusive fiado). Se custa menos, a sobra segue a RN-DEV-04 (abate fiado da venda original, depois devolução de valor). A dívida da venda original, se houver, **continua na venda original**. |
| RN-DEV-06 | A nova venda da troca segue todas as regras de venda (checagem de estoque, baixa, comprovante) e guarda `origin_return_id`. |
| RN-DEV-07 | **Receber peça** (de devolução ou cancelamento): condição **apta** → volta ao estoque (`return_in`, uma vez por item); **avariada** → não volta, fica registrada. Quando todos os itens chegam, o `return` vira `completed`. |
| RN-DEV-08 | **Devolução de valor**: fica pendente até a dona registrar “devolvido” com forma e data → entra no fechamento desse dia como saída. Pode ser anulada com motivo (lançada por engano). |
| RN-DEV-09 | Cancelamento comercial, retorno físico, devolução de dinheiro e cancelamento fiscal são registros separados, ligados à venda e visíveis na tela da venda (linha do tempo). |

## RN-REL — Relatórios (sem metas nem indicadores extras)

| ID | Regra | Origem |
| --- | --- | --- |
| RN-REL-01 | Todos os relatórios usam `business_date` e filtro de período (hoje, ontem, esta semana, este mês, mês anterior, personalizado). Semana = segunda a domingo. | C/P |
| RN-REL-02 | **Vendas por período** (agrupar por dia, semana ou mês): quantidade de vendas, subtotal, descontos, total; lista das vendas com itens. Canceladas aparecem **separadas** e não somam. Devoluções do período aparecem em bloco próprio (valor e itens). | C |
| RN-REL-03 | **Fiado em aberto**: clientes com saldo > 0, total por cliente, e ao abrir: dívidas, origem, recebimentos, saldo, data combinada, marcação “em atraso” (RN-FIA-03). | C |
| RN-REL-04 | **Mais e menos vendidos** no período, por produto e por variação: quantidade vendida (vendas confirmadas, não canceladas, com `business_date` no período), quantidade devolvida dessas vendas, **líquido**. Inclui produtos/variações **ativos sem venda** (quantidade 0). Ordenação nos dois sentidos. Itens de venda de troca contam como vendidos. | C/P |
| RN-REL-05 | **Fechamento do dia**: ver RN-FEC. | C |
| RN-REL-06 | Exportar cada relatório em CSV. | P |

## RN-FEC — Fechamento diário

Para o dia D (`business_date`):

| ID | Regra | Origem |
| --- | --- | --- |
| RN-FEC-01 | **Vendas do dia**: confirmadas em D (quantidade, subtotal, desconto, total) e quanto delas ficou no fiado. Cancelamentos feitos em D (de qualquer data) listados à parte. | C |
| RN-FEC-02 | **Recebimentos do dia por forma** (pagamentos `valid` com data D), separados em: “na venda” e “recebimentos de fiado”. Um fiado pago em D entra só como recebimento de D, sem contar a venda de novo. | C |
| RN-FEC-03 | **Devoluções de valor realizadas em D** por forma (saída). Saldo por forma = recebido − devolvido. Crédito de troca aparece à parte e **não** é dinheiro. | C |
| RN-FEC-04 | Cartão sempre rotulado **“transações de cartão registradas”** — nunca “saldo” ou “disponível”. | C |
| RN-FEC-05 | **Dinheiro**: esperado = dinheiro recebido − dinheiro devolvido em D. A dona informa o **valor contado**; o sistema mostra a diferença. Saldo de abertura e retiradas **[A]** fora da v1. | C |
| RN-FEC-06 | **Salvar fechamento** guarda um retrato (`snapshot`). Se algo daquele dia mudar depois (estorno, troca de forma de pagamento), o fechamento mostra “Alterado depois do fechamento” com as diferenças; a dona pode refazer (o retrato anterior vai para o `audit_log`). | C |
| RN-FEC-07 | Estornos de recebimento feitos em D aparecem listados (com a data original afetada). | P |
| RN-FEC-08 | Sem contas a pagar, conciliação, taxas de maquininha ou despesas. | C |

## RN-FIS — Fiscal (MEI) — ver `07-fiscal-mei.md`

| ID | Regra | Origem |
| --- | --- | --- |
| RN-FIS-01 | Na confirmação: cliente com CNPJ → `buyer_type = company_pj`; caso contrário `consumer_pf`. | P |
| RN-FIS-02 | `company_pj` → `fiscal_requirement = required` (“Venda para CNPJ: MEI deve emitir NF-e”). Fica como pendência fiscal até haver documento registrado. | P (fonte oficial em 07) |
| RN-FIS-03 | `consumer_pf` → `not_required` com nota “Consumidor pessoa física — dispensa de nota individual para MEI; confirmar com o contador”. | P/A |
| RN-FIS-04 | Envio para UF diferente da UF da loja → `review` (“Envio para outro estado: confirmar com o contador se a mercadoria precisa de nota para o transporte”). Prevalece sobre RN-FIS-03. | A |
| RN-FIS-05 | A dona pode marcar manualmente “cliente pediu nota” → `required`. | P |
| RN-FIS-06 | **Registro manual** da nota emitida fora do sistema (tipo, número, série, chave, data). O sistema não emite, não transmite e não consulta SEFAZ na v1. | D |
| RN-FIS-07 | Enquanto `store_settings.fiscal_rules_validated = false`, aparece faixa “Regras fiscais aguardando validação do contador” na área fiscal. | P |
| RN-FIS-08 | Nada fiscal cria venda, dívida ou movimento de estoque. Cancelar venda não cancela nota (RN-CAN-10). | C |
| RN-FIS-09 | Comprovantes sempre com “não é documento fiscal”. | C |

## RN-LOJ — Loja virtual (v2) — ver `11-loja-virtual.md`

| ID | Regra | Origem |
| --- | --- | --- |
| RN-LOJ-01 | Produto só aparece no site com **“mostrar no site”** ligado (padrão: desligado) e ativo. Fotos marcadas “só interna” não aparecem (RN-PRO-14). | Dev |
| RN-LOJ-02 | **Preço do site** por produto, opcional: vazio = preço do PDV (o da variação, ou o base). Preenchido, vale para todas as variações no site. Mudar o preço do site não mexe no PDV nem em vendas. | Dev |
| RN-LOJ-03 | “Esconder preço”: o site mostra “Consulte” no lugar do valor. | Dev |
| RN-LOJ-04 | Descrição do site separada da descrição interna (que pode ter anotações da dona). | P |

## RN-ACE — Acesso e dados

| ID | Regra | Origem |
| --- | --- | --- |
| RN-ACE-01 | Tudo exige login, exceto `/login`, `/esqueci-senha`, `/redefinir-senha`, `/api/health`, as fotos (`/api/media`) e, na v2, o site público da loja. | C |
| RN-ACE-02 | Recuperação de acesso por e-mail (SMTP) ou script no servidor. | C |
| RN-ACE-03 | “Sair de todos os aparelhos”. | P |
| RN-ACE-04 | **Exportar dados**: ZIP com CSVs de produtos, variações, movimentos, clientes, vendas, itens, pagamentos, dívidas, devoluções. | C |
| RN-ACE-05 | Toda gravação mostra confirmação explícita do que foi salvo (toast + estado na tela). | C |

---

## Cenários de aceite (seção 13 do contexto) — viram testes E2E e de serviço

| Cenário | Dado | Quando | Então |
| --- | --- | --- | --- |
| A1 Venda por variação | Preta M = 3, Preta G = 2 | vende 1 Preta M | Preta M = 2, Preta G = 2 |
| A2 Fiado parcial | venda R$ 150 toda no fiado | outro dia, recebe R$ 50 | saldo R$ 100; nenhuma venda nova; nenhum movimento de estoque; R$ 50 no fechamento do dia do recebimento |
| A3 Cancelamento com peça na loja | venda confirmada, envio pendente | cancela | peça volta 1 vez; repetir não muda nada; valores tratados (RN-CAN-05) |
| A4 Peça em retorno | venda entregue | cancela | estoque não muda; pendência “aguardando retorno”; ao receber “apta”, volta 1 unidade |
| A5 Maquininha | venda no cartão marcada aprovada | fechamento | aparece em “transações de cartão registradas”, não como saldo |
| A6 Clique repetido | rascunho pronto | confirma 2× (ou 2 abas) | 1 venda, 1 baixa, 1 pagamento |
| A7 Contagem | saldo 3 | acerto por contagem = 5 | saldo 5, delta +2 |
| A8 Troca de tamanho | venda Preta M R$ 100 paga | troca por Preta G R$ 100 | M volta (se apta), G sai, nova venda paga com crédito de troca, nada no caixa |
| A9 Troca com diferença | venda R$ 100 paga | troca por peça de R$ 130 | nova venda: R$ 100 crédito + R$ 30 pagos |
| A10 Concorrência | última unidade | 2 confirmações simultâneas | 1 sucesso, 1 erro de estoque |
