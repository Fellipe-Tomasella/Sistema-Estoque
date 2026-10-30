# 10 — Pendências (perguntas abertas)

Nenhuma delas trava o início. A coluna “Trava a etapa” diz até quando a resposta é necessária.
Ao receber uma resposta: registrar em `decisoes.md`, atualizar a regra correspondente e riscar aqui.

## Para a cliente (dona da loja)

| # | Pergunta | Por que importa | Padrão se não responder | Trava a etapa |
| --- | --- | --- | --- | --- |
| P1 | Em qual **estado e cidade** a loja está registrada? | Fuso do fechamento, alerta de envio interestadual, regras fiscais. | `America/Sao_Paulo`; UF em branco (sem alerta interestadual). | 1 (fuso) / 10 |
| P2 | Você tem uma **planilha** com as peças? Que colunas ela tem? Pode mandar uma cópia? | Ajustar o modelo de importação. | Usa o nosso modelo (RN-IMP-01). | 3 |
| P3 | Já existem **clientes devendo** de antes do sistema? Quantos, mais ou menos? | Habilitar “saldo anterior de fiado”. | Não implementa RN-FIA-11. | 6 |
| P4 | Você **cobra taxa de entrega** da cliente? Ela entra no total da venda? | Frete no total e no comprovante. | Sem taxa no sistema. | 5 |
| P5 | Como entrega hoje (Correios, motoboy, a cliente busca)? Envia para **outros estados**? | Envio e fiscal. | Envio simples sem transportadora. | 5 / 10 |
| P6 | Você **separa/guarda peças** enquanto a cliente não paga? | Reserva de estoque. | Rascunho não reserva. | 5 |
| P7 | No cartão você **parcela**? Precisa ver parcelas no sistema? | Campo de parcelas. | Parcelas só informativas. | 5 |
| P8 | Em **trocas**: a diferença a favor da cliente você devolve em dinheiro ou guarda como crédito? Há prazo para troca? | Vale-troca/crédito. | Devolve o valor (sem crédito guardado), sem prazo no sistema. | 8 |
| P9 | No dinheiro físico, você começa o dia com **troco** ou faz **retiradas**? | Fechamento de caixa. | Só “contado × esperado”. | 9 |
| P10 | Onde você vende (WhatsApp, Instagram, outro)? Quer registrar o canal em cada venda? | Campo canal. | Sem campo na tela. | 5 |
| P11 | Vende para **empresas (CNPJ)**? Com que frequência? | Volume de NF obrigatória. | Registro manual da NF. | 10 |
| P12 | Qual **e-mail** você usa para recuperar a senha? | Reset de senha. | Reset só pelo servidor. | 1 / 12 |

## Para o contador

As 7 perguntas de `07-fiscal-mei.md §5`. **Trava o uso real da parte fiscal** (switch “regras validadas”), não o desenvolvimento.

## Para o desenvolvedor (infra)

| # | Pergunta | Padrão |
| --- | --- | --- |
| D1 | O Nginx da VPS roda **em container** (qual rede Docker?) ou **instalado no host**? | Documentadas as duas opções (08 §4). |
| D2 | Subdomínio do sistema. | `estoque.<dominio>` |
| D3 | Destino da **cópia externa do backup** (storage de objetos, outro servidor, Google Drive via rclone…). | Sem cópia externa = backup incompleto; resolver antes de produção. |
| D4 | Provedor **SMTP** para o reset de senha (opcional). | Reset por script. |
| D5 | Repositório no GitHub (para CI e GHCR) e se será privado. | Privado. |
