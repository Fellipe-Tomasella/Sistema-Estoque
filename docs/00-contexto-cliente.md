# Contexto do projeto — Sistema de estoque e vendas para loja on-line

> **Cópia do levantamento original da cliente.** Não editar este arquivo: ele é a referência de negócio.
> Decisões tomadas depois do levantamento ficam em `docs/decisoes.md` e prevalecem sobre os pontos "a confirmar" daqui.

**Finalidade:** servir como contexto de negócio para desenvolver o sistema com o Claude.

**Data da consolidação e da pesquisa:** 30/10/2026.

## 1. Orientação para o Claude

Quero desenvolver um sistema web de gestão para uma pequena loja on-line de roupas, utilizada pela própria dona. O sistema deve reunir produtos, estoque, vendas, clientes, fiado, comprovantes e os relatórios descritos neste documento.

Este arquivo define o que o produto precisa permitir e como as operações devem se relacionar. As escolhas de linguagens, ferramentas, tecnologias, estrutura técnica e forma de implementação ficam sob sua responsabilidade. Apresente e justifique essas escolhas conforme a necessidade do projeto.

Não foram definidos indicadores adicionais, metas comerciais, metas de desempenho, orçamento ou cronograma. Preserve os relatórios solicitados, sem transformar este contexto em um projeto de análise de indicadores.

Considere a diferença entre:

- **Informação confirmada:** consta no levantamento da cliente.
- **Regra funcional proposta:** detalhamento elaborado para tornar a ideia consistente e utilizável; pode ser ajustado durante o desenvolvimento.
- **Ponto a confirmar:** depende de uma resposta da cliente ou de validação específica e não deve ser tratado como decisão já tomada.

Use as regras propostas como base de planejamento, sinalizando escolhas que alterem a rotina da loja. Resolva decisões técnicas por conta própria e faça perguntas objetivas quando uma dúvida de negócio realmente impedir o avanço.

## 2. Contexto confirmado da loja

| Assunto | Informação disponível |
| --- | --- |
| Operação | A loja é on-line e não possui loja física. |
| Usuária | Apenas a própria dona utilizará o sistema inicialmente. |
| Mercadorias | Peças com nome, tamanho, cor e preço. |
| Estoque atual | Aproximadamente 500 peças, segundo estimativa da dona. |
| Vendas | Selecionar produtos, montar carrinho, aplicar desconto e concluir a venda. |
| Pagamentos desejados | Dinheiro, Pix, cartão e fiado. |
| Maquininha | A dona confirmou que usa, sem esclarecer se precisa de integração. |
| Fiado | Cadastrar clientes, consultar dívidas e registrar pagamentos totais ou parciais. |
| Documentos | Gerar comprovante; existe preocupação com a necessidade de nota fiscal eletrônica. |
| Acesso | Usar no notebook e consultar pelo celular. |
| Possibilidade levantada | Avaliar uma experiência instalável no celular, como PWA. |

As aproximadamente 500 peças representam unidades físicas estimadas. Não presumir que existam 500 modelos diferentes ou 500 combinações de tamanho e cor. Esse número também não deve virar um limite de cadastro.

Os canais exatos de venda não foram confirmados. WhatsApp e Instagram foram mencionados na pergunta feita à cliente, mas a resposta apenas informou que a loja é on-line.

## 3. Objetivo e escopo principal

A dona precisa conseguir acompanhar o que tem para vender, registrar cada venda, saber quem ainda deve e conferir os movimentos do dia em um único lugar.

O núcleo solicitado compreende:

1. Cadastro de peças e suas variações.
2. Entrada de mercadorias e consulta do estoque.
3. Baixa automática após a confirmação da venda.
4. Aviso de estoque baixo.
5. Tela de venda rápida, com carrinho, pagamento e desconto.
6. Comprovante e consulta do histórico de vendas.
7. Cancelamento com tratamento do estoque e dos valores envolvidos.
8. Cadastro de clientes e controle de fiado.
9. Relatórios de vendas, pendências, produtos vendidos e fechamento diário.
10. Acesso web adequado ao notebook e ao celular.
11. Tratamento da necessidade fiscal conforme a situação real da empresa.

**Direção proposta:** começar pelo painel de gestão utilizado pela dona. A criação de uma vitrine pública, de um site para consumidores comprarem ou de um aplicativo para clientes depende de uma ampliação de escopo.

## 4. Produtos e variações

### Cadastro principal

Permitir cadastrar e editar o nome da peça e seu preço de venda. Tamanho e cor devem identificar a opção efetivamente vendida.

**Organização proposta:** cadastrar o modelo e, dentro dele, as combinações existentes. Exemplo: “Blusa básica” pode ter as opções “Preta / P”, “Preta / M” e “Branca / M”. Cada combinação tem seu próprio saldo.

O cadastro deve permitir:

- Adicionar apenas as combinações que a loja utiliza.
- Trabalhar com tamanhos por letras, números ou tamanho único.
- Definir preço por combinação quando houver diferença.
- Localizar a peça por nome e filtrar por tamanho ou cor.
- Inativar produtos que deixaram de ser vendidos, preservando o histórico.

Foto, categoria, referência interna e preço de compra são complementos sugeridos para facilitar identificação e organização. Não devem tornar o cadastro básico trabalhoso nem criar obrigações que a dona não informou.

**Regra proposta:** mudanças futuras no nome ou no preço do cadastro não podem alterar silenciosamente os dados de uma venda já concluída.

## 5. Estoque

### Saldo inicial e entrada de mercadorias

Permitir informar o estoque inicial de cada combinação e registrar novas entradas quando mercadorias forem recebidas de fornecedores.

Cada entrada deve identificar a peça, sua variação, quantidade e data. A identificação do fornecedor, referência da compra, custo e observações podem complementar o registro conforme a rotina da loja.

Como o volume informado é aproximado, o saldo inicial deve ser baseado na contagem real. A existência de uma planilha ainda precisa ser confirmada. Caso exista, avaliar a importação para evitar trabalho repetido, com conferência dos dados antes de efetivar a entrada.

### Saídas e correções

**Regras funcionais propostas:**

- A venda confirmada reduz o estoque da combinação vendida, inclusive quando for fiado.
- Montar um carrinho ou deixar uma venda em rascunho não confirma a saída.
- A quantidade disponível deve ser conferida novamente ao concluir a venda.
- Impedir a conclusão com quantidade maior que o saldo disponível. Venda sob encomenda não faz parte da rotina informada.
- Uma mesma venda não pode gerar duas baixas por repetição de clique, recarregamento ou nova tentativa após falha.
- Permitir ajustes por contagem, perda, avaria ou erro, sempre com motivo e histórico.
- Distinguir uma nova entrada de uma correção de saldo. Se a contagem física encontrou cinco unidades, corrigir o saldo para cinco não significa acrescentar outras cinco.

### Consulta e alerta

Mostrar o saldo por modelo, tamanho e cor, com destaque para opções sem estoque e para as que precisam de reposição.

Permitir que a dona escolha o nível de alerta de cada variação. Nenhum valor fixo foi definido neste contexto. O aviso dentro do próprio sistema é a proposta inicial; avisos por canais externos precisam ser combinados separadamente.

O histórico deve permitir entender qual entrada, venda, cancelamento ou ajuste modificou a quantidade.

## 6. Vendas e PDV

### Experiência desejada

Uma tela de uso simples para registrar as vendas feitas pela dona nos seus canais on-line. “PDV” representa essa tela de venda rápida, mesmo sem balcão ou loja física.

Fluxo proposto:

1. Buscar a peça.
2. Escolher tamanho, cor e quantidade.
3. Adicionar ao carrinho.
4. Vincular o cliente quando necessário.
5. Aplicar desconto, se houver.
6. Informar a forma e a situação do pagamento.
7. Conferir e confirmar.
8. Consultar ou gerar o comprovante.

O carrinho deve mostrar os itens, quantidades, valores, desconto e total. Deve ser possível corrigir ou remover itens antes de finalizar.

### Pagamento e desconto

Permitir registrar dinheiro, Pix, cartão e fiado.

**Proposta inicial para a maquininha:** a dona realiza a cobrança no equipamento que já utiliza e registra no sistema a forma de pagamento. A integração automática não foi solicitada de forma conclusiva.

Selecionar Pix ou cartão não deve, por si só, declarar que o pagamento foi confirmado. Na operação manual, a dona informa a confirmação do recebimento ou da aprovação da transação. Uma venda aguardando confirmação pode permanecer em rascunho.

O desconto pode ser informado em valor ou percentual, com total atualizado de forma clara. Não permitir desconto que gere valor negativo nem aplicar o mesmo desconto duas vezes.

Como complemento proposto, permitir uma entrada paga no momento e o restante em fiado, sempre com cliente identificado. Parcelamento no cartão precisa ser confirmado com a dona e deve permanecer separado do fiado combinado diretamente com o cliente.

### Histórico e situações

Guardar a identificação da venda, data, itens e variações, quantidades, valores, desconto, cliente quando vinculado, pagamentos e saldo pendente.

Separar a situação da venda da situação do pagamento: uma venda confirmada pode estar integralmente paga ou ter fiado pendente. Se houver acompanhamento de entrega, sua situação também deve ser independente.

Depois de concluída, correções que afetem estoque ou valores precisam deixar histórico. Alterar o total de uma venda antiga não pode apagar o que foi cobrado ou recebido.

### Comprovante

Permitir visualizar, baixar ou imprimir um comprovante com identificação da loja, venda, data, itens, variações, quantidades, desconto, total e informação de pagamento.

Quando houver fiado, mostrar o valor recebido e o saldo em aberto. Não apresentar uma venda pendente como quitada. O arquivo pode ser compartilhado manualmente pela dona, sem exigir integração com aplicativos de mensagem.

O comprovante comercial deve ser identificado como tal. Sua geração não substitui o tratamento fiscal descrito adiante.

## 7. Clientes e fiado

### Cadastro

Permitir um cadastro simples com nome, contato e observações úteis. Vincular o cliente obrigatoriamente às vendas no fiado.

Para vendas pagas, a identificação deve seguir a necessidade da operação e do documento fiscal aplicável. Endereço e dados fiscais devem ser solicitados quando necessários, sem exigir um cadastro extenso para toda interação.

Clientes com o mesmo nome não devem ter suas dívidas misturadas.

### Consulta das dívidas

Permitir consultar por cliente:

- As vendas que originaram as pendências.
- A data de cada venda.
- O valor original de cada dívida.
- Os pagamentos já registrados.
- O saldo que continua em aberto.
- A data combinada para pagamento, quando existir.

Disponibilizar uma lista de clientes com saldo pendente. “Em aberto” deve significar que ainda há valor a pagar. “Em atraso” só deve ser utilizado quando existir um vencimento informado e ultrapassado.

### Recebimentos

Permitir registrar pagamentos totais ou parciais, identificando data, valor, forma de pagamento e a dívida à qual o valor se refere.

**Regras funcionais propostas:**

- Pagamento parcial reduz somente o saldo correspondente, sem encerrar o restante da dívida.
- Pagamento de fiado não cria outra venda e não movimenta novamente o estoque.
- Quando o cliente possui várias dívidas, mostrar quais estão sendo quitadas; a distribuição do valor precisa ficar clara.
- Não registrar valor acima do saldo selecionado sem um tratamento explícito. Crédito para compras futuras não está definido neste escopo.
- Corrigir recebimento lançado por engano com registro do motivo e recomposição do saldo afetado.
- Preservar o histórico depois da quitação.
- Permitir consultar ou gerar um comprovante do recebimento.

Não há definição de juros, multas, análise de crédito, limite de fiado ou cobrança automática. Esses recursos só devem entrar se forem solicitados posteriormente.

**Ponto a confirmar para o início do uso:** se já existem dívidas anteriores, avaliar seu lançamento como saldo inicial de fiado, com identificação e data disponíveis. Isso não deve criar vendas novas nem retirar novamente peças do estoque.

## 8. Cancelamentos, devoluções e trocas

O cancelamento de venda faz parte do pedido original. O tratamento abaixo é uma proposta para manter estoque e valores coerentes com a operação on-line.

### Cancelamento

Permitir localizar a venda, informar o motivo e conferir seus efeitos antes de confirmar o cancelamento.

- Se a peça permanece com a loja e está apta à venda, recompor o estoque da variação correta.
- Se já foi enviada ou entregue, não torná-la disponível antes de confirmar seu retorno e condição. O sistema deve deixar a pendência visível.
- Se há fiado não pago, cancelar a cobrança correspondente.
- Se já houve pagamento total ou parcial, preservar o recebimento e identificar o valor a devolver e sua situação.
- Registrar a devolução do dinheiro quando efetivamente realizada, para que apareça no movimento do dia correto.
- Impedir que a repetição do cancelamento devolva a mesma quantidade ao estoque duas vezes.
- Manter a venda cancelada no histórico e identificá-la nos relatórios.

Registrar um estorno no sistema não deve simular a execução de um estorno na maquininha ou de uma transferência bancária. Esses efeitos externos dependem de ação real ou de integração especificamente implementada.

### Complemento sugerido: devolução parcial e troca

Como a loja trabalha com peças de diferentes tamanhos, é útil avaliar um fluxo simples para devolução de parte de uma compra e troca por outra peça.

Se esse complemento for incluído, registrar os itens recebidos de volta, sua condição, os novos itens entregues e eventual diferença de valor. Vincular a operação à venda original, preservando seu histórico. Não assumir política de vale-troca, prazos comerciais ou concessão de crédito sem confirmação da dona.

Cancelamento comercial, retorno físico da peça, devolução do dinheiro e eventual cancelamento fiscal são acontecimentos relacionados, mas precisam ter seus registros próprios.

## 9. Relatórios e fechamento diário

Manter os relatórios pedidos, com leitura simples e filtros de período. Não acrescentar indicadores ou metas comerciais neste contexto.

| Consulta solicitada | O que deve permitir acompanhar |
| --- | --- |
| Vendas por dia, semana ou mês | As vendas do período, seus itens e valores, com cancelamentos e devoluções identificados. |
| Fiado em aberto | Clientes, origem das dívidas, pagamentos e saldo pendente. |
| O que mais vende e o que menos vende | Produtos e variações ordenados pelas quantidades vendidas no período, incluindo os sem venda, sem tratar venda cancelada como venda válida. |
| Fechamento de caixa do dia | Conferir as vendas, recebimentos registrados, recebimentos de fiados anteriores e devoluções de valores, separados por forma de pagamento. |

### Regras propostas para evitar confusão no fechamento

- Distinguir a data da venda da data de cada recebimento.
- Uma venda no fiado aparece nas vendas de sua data, mas a parte não paga continua em aberto.
- Quando esse fiado é pago depois, o dinheiro entra nos recebimentos da data do pagamento, sem contar a venda novamente.
- Apresentar as transações de cartão separadamente. Aprovação na maquininha não comprova que o dinheiro já foi depositado na conta da loja.
- Sem controle específico de repasses, apresentar valores de cartão como transações registradas, sem chamá-los de saldo bancário disponível.
- No dinheiro físico, permitir conferência do valor contado. Saldo inicial, entradas e retiradas avulsas são complementos a validar se fizerem parte da rotina.
- Guardar o fechamento consultável e deixar eventuais correções posteriores identificáveis.

O fechamento proposto é uma conferência da operação. Contas a pagar, conciliação bancária, taxas da maquininha e controle completo de despesas ainda não foram solicitados.

## 10. Documentação fiscal

**Necessidade identificada:** a cliente está preocupada com a emissão de nota fiscal eletrônica. Isso deve ser tratado no projeto, sem presumir que somente um recibo atenderá à operação.

A informação recebida de que haverá obrigação universal a partir de 2027 não deve ser utilizada como regra pronta. Em 23/10/2026, a Receita Federal publicou simplificações que incluem a possibilidade de uso da DASN-Simei como documento fiscal eletrônico em operações de MEI destinadas a consumidor final pessoa física. Esse exemplo mostra que enquadramento e operação importam; não permite concluir que esta loja esteja dispensada. [Fonte: Receita Federal — medidas de outubro de 2026](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/outubro/novas-medidas-simplificam-obrigacoes-da-reforma-tributaria-para-nanoempreendedores-e-meis).

Roupas são mercadorias. NF-e e, nas hipóteses aplicáveis, NFC-e precisam ser avaliadas para esse contexto; a NFS-e se refere a serviços. O documento adequado deve ser confirmado para a empresa e a operação. [Fontes: Portal do Empreendedor](https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/servicos-para-mei/nota-fiscal) e [Receita Federal — documentos fiscais](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/reforma-tributaria-do-consumo/orientacoes-da-reforma-tributaria/cronograma).

### O que precisa ser esclarecido

- Se a loja possui CNPJ e qual é seu enquadramento.
- Estado e município de operação.
- Se vende para pessoas físicas, empresas ou ambas.
- Como faz as entregas e se envia para outros estados.
- Qual documento utiliza atualmente e qual orientação recebe do contador.

### Comportamento desejado após a validação

Definir a necessidade de emissão fiscal dentro do sistema e sua abrangência com base nessas respostas. Quando a emissão fizer parte do produto, vincular o documento à venda, mostrar sua situação real, disponibilizá-lo quando autorizado e permitir acompanhar falhas ou pendências.

Gerar um arquivo ou tentar emitir não equivale a ter uma nota autorizada. Uma falha fiscal também não pode criar outra venda, outra dívida ou nova baixa de estoque.

Cancelar a venda no painel não deve declarar automaticamente que a nota foi cancelada. As regras de emissão, autorização e cancelamento fiscal devem ser validadas antes de usar essa parte na operação real.

Não escolher neste documento um fornecedor de emissão nem adiar automaticamente o assunto para 2027. A necessidade pode afetar o início do uso, conforme validação contábil e regras aplicáveis. Reconfirmar as fontes na data da implementação.

## 11. Acesso, usabilidade e preservação dos dados

### Notebook e celular

O sistema deve funcionar no navegador, com telas adaptadas aos dois tipos de dispositivo. O notebook será o foco do trabalho diário; no celular, a dona deve consultar estoque, vendas e fiado com facilidade. Operações simples pelo celular são desejáveis, conforme a experiência proposta pelo Claude.

Usar português do Brasil, valores em reais e datas claras. A navegação deve permitir encontrar rapidamente produtos, vendas e clientes, com mensagens compreensíveis quando faltar informação ou algo não puder ser concluído.

### Possibilidade de PWA

Avaliar a possibilidade de adicionar o sistema à tela inicial do celular e utilizá-lo com experiência de aplicativo. Essa é uma opção levantada, ainda sem decisão técnica. Instalação e funcionamento sem internet devem ser discutidos como capacidades distintas; não há pedido confirmado de vendas ou recebimentos off-line. [Referência: MDN — Progressive Web Apps](https://developer.mozilla.org/pt-BR/docs/Web/Progressive_web_apps).

### Regras de confiança propostas

- Acesso privado para a dona, com possibilidade de recuperar o acesso.
- Mesmos registros disponíveis no notebook e no celular.
- Dados salvos de forma persistente, sem depender de manter uma página aberta.
- Preservação de histórico e possibilidade de recuperar dados em caso de perda ou erro.
- Possibilidade de obter uma cópia dos cadastros e registros da loja em formato utilizável.
- Confirmação clara de que uma venda, entrada ou recebimento foi salvo.
- Proteção contra duplicidade ou conclusão incompleta, inclusive se a dona usar dois dispositivos.
- Dados de clientes e do negócio acessíveis apenas a quem estiver autorizado.

O Claude deve definir como atender a essas necessidades. Não foram especificados mecanismos técnicos neste arquivo.

## 12. Organização sugerida das telas

Esta organização é uma proposta funcional; o Claude pode aprimorá-la mantendo os fluxos simples.

| Área | Uso principal |
| --- | --- |
| Início | Acesso às rotinas e avisos de estoque baixo ou pendências. |
| Produtos e estoque | Cadastrar peças, variações, entradas e ajustes; consultar saldos. |
| Nova venda | Selecionar itens, montar carrinho e concluir. |
| Vendas | Consultar histórico, pagamentos, comprovantes e cancelamentos. |
| Clientes e fiado | Consultar dívidas e registrar recebimentos. |
| Relatórios e fechamento | Conferir as consultas solicitadas e o movimento diário. |
| Configurações | Dados da loja, preferências de uso, acesso e parâmetros aplicáveis. |

A documentação fiscal deve ficar acessível a partir da venda e das pendências correspondentes, caso sua emissão seja incluída após validação.

## 13. Exemplos de comportamento esperado

Os números a seguir são apenas exemplos para explicar as regras, sem representar metas ou métricas do projeto.

**Venda por variação:** existem três blusas pretas M e duas pretas G. Ao vender uma preta M, restam duas M e duas G. O saldo da G não muda.

**Fiado com pagamento parcial:** uma venda de R$ 150 fica no fiado. Em outro dia, a cliente paga R$ 50. O saldo passa a R$ 100; esse pagamento não cria nova venda nem outra saída de estoque.

**Cancelamento com peça na loja:** uma venda confirmada é cancelada antes da entrega. A peça volta a ficar disponível uma única vez, e os valores pagos ou pendentes recebem o tratamento correspondente.

**Peça ainda em retorno:** o cancelamento de uma compra já entregue não torna a peça vendável enquanto ela ainda está com a cliente. O retorno físico precisa ser registrado.

**Maquininha:** a dona registra uma venda no cartão após a aprovação no equipamento. O registro informa a transação e não presume que o repasse já entrou no banco.

**Falha ou clique repetido:** se a confirmação da venda for reenviada, a dona deve conseguir identificar a mesma venda, sem duplicar estoque, cobrança ou pagamento.

## 14. Complementos e decisões pendentes

| Ponto | Orientação para o desenvolvimento |
| --- | --- |
| Situação fiscal | Validar enquadramento, localização e operações antes de fechar a solução fiscal. |
| Maquininha | Confirmar se basta registrar os pagamentos e se há parcelamento. Integração exige necessidade expressa. |
| Canais de venda | Identificar onde a dona vende hoje. Registrar o canal pode ajudar, mas não implica conectar os canais automaticamente. |
| Entrega e frete | Confirmar se precisa de endereço, taxa de entrega e acompanhamento simples de envio. Não presumir cálculo de frete ou transportadora integrada. |
| Reserva de peças | Confirmar se a dona separa mercadorias enquanto espera pagamento. A proposta básica não reserva rascunhos. Se necessário, distinguir quantidade reservada e disponível e definir como liberar a reserva. |
| Cadastro inicial | Confirmar se existe planilha, quais informações ela contém e como conferir as quantidades. |
| Fiado anterior | Verificar se há dívidas a cadastrar antes do início do uso, sem gerar vendas ou saídas fictícias. |
| Trocas e devoluções parciais | Confirmar a rotina e o tratamento das diferenças de valor. |
| Dinheiro físico | Confirmar se há saldo de abertura, retiradas e outras movimentações a incluir na conferência. |
| PWA | Avaliar benefício para a dona e decidir a experiência de instalação. Uso off-line não está confirmado. |

Esses pontos não impedem estruturar os módulos já descritos. As perguntas devem ser feitas quando afetarem a parte que está sendo planejada, sem transformar todas as possibilidades em requisitos obrigatórios.

Multiusuário, várias empresas, múltiplos estoques, marketplace, catálogo público, cobrança automática e integrações com bancos, redes sociais ou transportadoras não foram pedidos. Só acrescentá-los diante de uma necessidade identificada e confirmada.

## 15. Referências pesquisadas

A pesquisa serviu para observar soluções de problemas semelhantes. Não representa escolha de fornecedor nem pedido para reproduzir interfaces ou todas as funções desses produtos. As adaptações deste arquivo são propostas específicas para a loja descrita.

| Referência oficial | Prática observada | Aplicação proposta |
| --- | --- | --- |
| [Bling — produtos com variações](https://ajuda.bling.com.br/hc/pt-br/articles/360035987033-Cadastrar-produtos-com-varia%C3%A7%C3%A3o) e [movimentação de estoque](https://ajuda.bling.com.br/hc/pt-br/articles/360035628694-Como-inserir-estoque-no-produto-do-Bling) | Organização de variações; entradas, saídas e balanço de estoque. | Cadastro de modelos com tamanho/cor e distinção entre entrada e correção de saldo. |
| [Olist/Tiny — contas a receber](https://ajuda.olist.com/pt_BR/gestao-financeira/contas-a-receber) e [devoluções de vendas](https://ajuda.olist.com/pedidos/devolucoes-de-vendas) | Recebimentos parciais e tratamento de devoluções vinculadas às vendas. | Histórico de pagamentos e efeitos explícitos sobre dívida, mercadoria e valores devolvidos. |
| [Kyte — variantes](https://docs.kyteapp.com/pt-BR/articles/8900471-como-cadastrar-produtos-com-variantes) e [venda no fiado](https://docs.kyteapp.com/pt-BR/articles/9298385-como-fazer-uma-venda-no-fiado) | Estoque por variação e fiado ligado ao cliente em rotinas de aplicativo e web. | Consulta simples de disponibilidade e cliente identificado nas vendas a prazo. |

As fontes fiscais e a referência sobre PWA estão junto às respectivas seções. Todas foram consultadas em 30/10/2026 e devem ser verificadas novamente quando mudanças puderem afetar a implementação.

## 16. Resultado esperado do trabalho com o Claude

Usar este contexto para propor uma solução simples para a dona, escolher os meios de implementação e conduzir o desenvolvimento de um sistema funcional.

A prioridade é que cadastrar uma peça, registrar uma entrada, vender, receber um fiado e cancelar uma operação mantenham produtos, estoque, valores e histórico consistentes. Os relatórios devem refletir esses registros.

Ao apresentar a proposta, explicar o entendimento do negócio, a organização da experiência, as escolhas de implementação e as dúvidas que realmente exigem decisão da cliente. Manter os complementos separados do núcleo solicitado e evitar ampliar o projeto sem necessidade.
