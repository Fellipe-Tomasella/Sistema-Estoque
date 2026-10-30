# 07 — Fiscal (MEI)

> Pesquisa feita em **30/10/2026**. Regras fiscais mudam: **reconferir as fontes e validar com o contador antes de usar em produção.**
> Este documento não é parecer contábil.

## 1. Situação

- Enquadramento: **MEI** (informado pelo desenvolvedor em 30/10/2026).
- Atividade: venda de **mercadorias** (roupas) → documentos possíveis: NF-e (modelo 55), NFC-e (modelo 65, onde o estado permite)
  ou NFA-e (nota avulsa, em estados que a oferecem ao MEI). NFS-e é para serviços e **não se aplica** às vendas de roupa.
- Ainda **não sabemos**: UF e município, se tem Inscrição Estadual, se vende para empresas, se envia para outros estados,
  o que usa hoje e o que o contador orienta. → `10-pendencias.md`.

## 2. O que as fontes dizem

| Situação | Regra encontrada | Fonte |
| --- | --- | --- |
| Venda para **consumidor final pessoa física**, até 31/12/2026 | MEI dispensado de emitir documento fiscal (regra geral). | Receita Estadual RS — atendimento.receita.rs.gov.br |
| Venda para consumidor final **pessoa física sem CNPJ**, a partir de **01/01/2027** | A **DASN-Simei** pode ser usada como documento fiscal eletrônico (art. 106-C incluído na Res. CGSN 140/2018 pela **Res. CGSN 195/2026**, publicada no DOU em 22/10/2026, efeitos a partir de 01/01/2027). | LegisWeb (texto da resolução); Receita Federal (notícia de 23/10/2026) |
| Venda para **empresa (CNPJ)** | Emissão obrigatória, salvo quando o destinatário emite nota fiscal de entrada. | Receita Estadual RS |
| Envio de mercadoria para **outro estado** | Há orientações de que a mercadoria em trânsito interestadual deve estar acompanhada de nota, mesmo para PF. **Fonte não oficial → confirmar com o contador.** | Jornal Contábil (artigo) |
| Emissão de NF-e pelo MEI | Depende de cadastro estadual (Inscrição Estadual) e das regras de cada SEFAZ. **Confirmar.** | Artigos especializados (não oficiais) |

Observações:
- Uma regra anterior (Res. CGSN 190/2026) chegou a prever o fim da dispensa para PF em 2027; a Res. CGSN 195/2026 trouxe
  a alternativa da DASN-Simei. Por isso **não** tratamos 2027 como “obrigação universal de nota”, mas também **não** concluímos
  que a loja está dispensada em todos os casos (PJ, envio interestadual, pedido do cliente e regras estaduais podem exigir nota).
- A dispensa nunca significa que o comprovante do sistema seja nota fiscal.

Links:
- Receita Federal — notícia de 23/10/2026: https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/outubro/novas-medidas-simplificam-obrigacoes-da-reforma-tributaria-para-nanoempreendedores-e-meis
- Resolução CGSN nº 195/2026 (LegisWeb): https://www.legisweb.com.br/legislacao/?id=503248
- Receita Estadual RS — “O MEI é obrigado a emitir nota fiscal?”: https://atendimento.receita.rs.gov.br/o-mei-e-obrigado-a-emitir-nota-fiscal
- Portal do Empreendedor — nota fiscal: https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/servicos-para-mei/nota-fiscal

## 3. O que o sistema faz na v1 (decisão)

O sistema **organiza e sinaliza**; **não emite** nota. A dona emite, quando precisar, no emissor que já usa (portal da SEFAZ,
emissor gratuito do estado ou outro indicado pelo contador) e **registra** a nota na venda.

1. **Classificação automática na confirmação** (RN-FIS-01 a 05):
   - Cliente com CNPJ → **Nota obrigatória** (pendência até registrar).
   - Envio para UF diferente da loja → **Revisar com contador**.
   - Cliente pediu nota → **Nota obrigatória** (marcação manual).
   - Demais (PF) → **Dispensa provável** com o texto “confirmar com o contador”.
2. **Pendências fiscais** na tela de Pendências e no Início.
3. **Registro manual** da nota (tipo, número, série, chave de 44 dígitos, data) → aparece na venda e no comprovante (“NF-e nº …”).
4. **Cancelamento** de venda com nota registrada → nota vai para “cancelamento pendente” até a dona registrar que cancelou no emissor.
5. **Faixa de aviso** enquanto o switch “regras validadas pelo contador” estiver desligado.
6. Comprovante sempre com **“Comprovante de venda — não é documento fiscal.”**

Assim o sistema já pode entrar em uso sem depender da resposta do contador, e nada do que ele responder exige refazer vendas.

## 4. Depois da validação (fora da v1, decidir com dados)

| Se o contador disser… | Então |
| --- | --- |
| Vendas a PF não precisam de nota e há poucas vendas a PJ/interestaduais | Manter v1 (registro manual). |
| Precisa de nota em muitas vendas (ex.: todo envio interestadual) | Avaliar integração com um **emissor via API** (decidir fornecedor nesse momento, com custo). A `fiscal_documents` ganha `status` real (`processing`, `authorized`, `rejected`, `cancelled`), `xml`/`pdf` e reprocessamento. A falha fiscal **nunca** cria venda, dívida ou baixa (RN-FIS-08). |
| Precisa de algum relatório para a DASN-Simei / controle mensal de receitas | Criar relatório de receita bruta mensal **exatamente no formato pedido pelo contador** (não inventar antes). |

## 5. Perguntas para o contador (copiar e enviar)

1. A loja (MEI) tem Inscrição Estadual? Em qual UF e município?
2. Para vendas on-line a pessoa física **no mesmo estado**, precisa emitir nota em 2026? E a partir de 2027, com a DASN-Simei como documento fiscal?
3. Para vendas a pessoa física em **outro estado**, com envio pelos Correios/transportadora, precisa de nota para o transporte? Qual (NF-e, NFA-e)?
4. Para vendas a **empresas (CNPJ)**: qual emissor usar? NF-e ou NFA-e no nosso estado?
5. Há algum controle mensal de receitas que o sistema deveria gerar para facilitar a DASN-Simei? Em que formato?
6. Ao cancelar uma venda ou receber devolução de mercadoria com nota emitida, qual o procedimento (cancelamento, nota de devolução/entrada)?
7. Algum outro limite ou obrigação do MEI que devamos sinalizar no sistema?
