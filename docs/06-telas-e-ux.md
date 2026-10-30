# 06 — Telas, experiência e PWA

## 1. Princípios visuais

- shadcn-vue + Tailwind v4, tema claro por padrão (modo escuro opcional nas Configurações), fonte do sistema ou Inter.
- Uma cor de destaque; cores de estado consistentes: **vermelho** = sem estoque/atraso/cancelada, **âmbar** = repor/pendente,
  **verde** = pago/entregue/confirmado, **cinza** = rascunho/inativo. Nunca só cor: sempre texto no badge.
- Valores com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`; datas `dd/mm/aaaa` e “hoje, 14:32”.
- Campos de dinheiro com `MoneyInput` (digita só números, formata R$ ao vivo).
- Toda ação destrutiva/financeira: `ConfirmDialog` com o resumo do efeito.
- Estados vazios explicativos (“Nenhuma venda hoje. [Nova venda]”). Carregamento com skeleton.
- Acessível: foco visível, navegação por teclado no PDV, labels em todos os campos, alvo de toque ≥ 44px no celular.

## 2. Navegação

**Desktop (≥ 1024px):** sidebar fixa à esquerda + botão destacado **“Nova venda”** no topo + busca global (Ctrl+K: produto,
cliente, venda #).
**Celular (< 768px):** barra inferior com 5 itens: Início · Estoque · **Vender** · Fiado · Mais (Vendas, Relatórios, Clientes,
Configurações). Cabeçalho com busca.

| Área | Rota | Uso |
| --- | --- | --- |
| Início | `/` | avisos e atalhos |
| Produtos | `/produtos`, `/produtos/novo`, `/produtos/:id` | cadastro e variações |
| Estoque | `/estoque`, `/estoque/entradas`, `/estoque/entradas/nova`, `/estoque/acertos/novo`, `/estoque/importar`, `/estoque/movimentos` | |
| Nova venda (PDV) | `/vender`, `/vender/:draftId` | |
| Vendas | `/vendas`, `/vendas/:id` | histórico, detalhe, cancelar, devolver/trocar, envio, NF |
| Clientes e fiado | `/clientes`, `/clientes/:id`, `/fiado` (em aberto), `/fiado/receber?cliente=` | |
| Pendências | `/pendencias` | retornos físicos, devoluções de valor, envios, fiscal (abas) |
| Relatórios | `/relatorios/vendas`, `/relatorios/fiado`, `/relatorios/mais-vendidos`, `/fechamento/:data?` | |
| Configurações | `/configuracoes` | loja, fuso, fiscal, senha, sessões, exportar dados, tema |
| Login | `/login`, `/esqueci-senha`, `/redefinir-senha` | |

## 3. Telas principais

### 3.1 Início
Cartões: **Sem estoque (n)** · **Repor (n)** · **Rascunhos (n)** · **Aguardando envio (n)** · **Aguardando retorno (n)** ·
**Devoluções de valor pendentes (n)** · **Fiado em atraso (n)** · **Pendências fiscais (n)**. Cada um leva à lista filtrada.
Resumo de hoje: vendas confirmadas (quantidade e total) e recebimentos — é só um atalho para o fechamento, sem gráficos nem metas.

### 3.2 Produto (cadastro/edição)
1. Nome, preço base. “Mais detalhes” recolhido: referência, categoria, custo, descrição.
2. **Variações**: botão “Gerar combinações” → escolhe cores (chips com sugestões) e tamanhos (chips com presets “PP–GG”, “34–46”, “Único”)
   → grade com checkbox por combinação. Cada linha: cor, tamanho, preço (placeholder = base), **quantidade inicial**, alerta mínimo.
3. Salvar → toast “Blusa básica salva com 3 variações e 8 peças em estoque”.
Detalhe do produto: grade cor × tamanho com saldo (badges), ações por variação: entrada, acerto, histórico, editar, inativar.

### 3.3 Estoque
Lista/grade com busca e filtros (cor, tamanho, categoria, sem estoque, repor). Desktop: tabela agrupada por produto.
Celular: cartões por produto com mini-grade de tamanhos. Toque numa variação → histórico.

**Entrada de mercadoria:** data, fornecedor (opcional), linhas com busca de variação (`/variants/search`) + quantidade + custo opcional.
Resumo antes de salvar: “+12 peças em 4 variações”.

**Acerto:** escolhe variação → motivo. Se “contagem”: mostra saldo atual e campo “quantas você contou?” com prévia “saldo vai de 3 para 5 (+2)”.
Outros motivos: “tirar” ou “acrescentar” + quantidade + observação.

**Importar planilha:** baixar modelo → enviar arquivo → prévia (abas: “Vai ser criado”, “Erros”) → efetivar. Mensagem final com totais.

### 3.4 PDV — Nova venda (desktop: 2 colunas)
- **Esquerda:** busca com foco automático (digitar “blusa preta m” encontra a variação). Resultado em lista: produto · cor/tamanho · preço · saldo.
  Enter adiciona 1. Alternativa: escolher produto → chips de cor → chips de tamanho (desabilitados sem saldo, com o número de peças).
- **Direita (carrinho):** itens com +/− e remover; cliente (busca + “novo cliente” rápido); desconto (R$/% toggle);
  envio (switch → endereço/UF/rastreio); **pagamentos**: botões Dinheiro · Pix · Cartão · Fiado; cada pagamento é uma linha com valor
  (preenche o restante por padrão) e o toggle **“Recebido”/“Aprovado na maquininha”**; o restante não coberto vira fiado se a dona escolher Fiado.
- Rodapé fixo: subtotal, desconto, **total**, pago, **fica no fiado**, botão **Confirmar venda** (desabilitado com o motivo).
- Confirmar → diálogo de conferência (itens, total, pagamentos, fiado, cliente, envio) → sucesso: “Venda #000123 confirmada” + botões
  **Ver comprovante** · **Baixar PDF** · **Compartilhar** (Web Share API quando disponível) · **Nova venda**.
- O rascunho é salvo no servidor a cada alteração (debounce 500ms, com `version`). Indicador “Salvo” / “Salvando…”.
- Atalhos: `/` busca, `F2` desconto, `F4` pagamento, `Ctrl+Enter` confirmar.

**Celular:** fluxo em passos (Itens → Cliente/Envio → Pagamento → Conferir).

### 3.5 Venda (detalhe)
Cabeçalho: número, data, badges (situação, pagamento, envio, fiscal). Itens, valores, pagamentos, dívida.
**Linha do tempo:** confirmada, pagamentos, recebimentos de fiado, envio, devoluções, cancelamento, devoluções de valor, NF.
Ações: Comprovante · Atualizar envio · Devolver/Trocar · Cancelar venda · Trocar forma de pagamento · Registrar NF · Cliente pediu nota.

**Cancelar:** pergunta “As peças estão com você?” (RN-CAN-03) → prévia dos efeitos em lista clara → motivo → confirmar.
**Devolver/Trocar:** passo 1 escolher peças e quantidades + “recebida agora (apta/avariada)” ou “ainda com a cliente”;
passo 2 “Devolver valor” ou “Trocar por outra peça” (abre mini-PDV); passo 3 prévia (abate fiado, crédito, a devolver, a pagar) → confirmar.

### 3.6 Clientes e fiado
Lista com busca, saldo em aberto e badge “em atraso”. Detalhe: dados, **dívidas** (abertas primeiro), compras, recebimentos.
**Receber fiado:** valor → distribuição sugerida (das mais antigas) editável por dívida → forma e data → prévia “Saldo de Maria passa de R$ 150,00 para R$ 100,00” → salvar → comprovante.
Estornar recebimento: no histórico, com motivo.

### 3.7 Relatórios e fechamento
Filtro de período comum. Tabelas simples com totais, botão CSV. Sem gráficos obrigatórios (um gráfico de barras simples por dia
em “Vendas por período” é aceitável como leitura, não como meta).
**Fechamento:** escolhe o dia (padrão hoje) → blocos: Vendas · Recebimentos por forma (na venda / fiado) · Devoluções de valor ·
Saldo por forma · Crédito de troca (informativo) · **Dinheiro: esperado × contado** · Observações → **Salvar fechamento**.
Se alterado depois: faixa âmbar com as diferenças.

### 3.8 Configurações
Dados da loja (comprovante), UF/município, fuso, regime (MEI), “regras fiscais validadas pelo contador” (switch), rodapé do comprovante,
alterar senha, sair de todos os aparelhos, exportar dados (ZIP), tema.

## 4. Mensagens (exemplos de tom)

- Sucesso: “Entrada salva: +12 peças.” · “Recebimento de R$ 50,00 registrado. Maria ainda deve R$ 100,00.”
- Erro de estoque: “Não foi possível confirmar: só há 1 unidade de Blusa básica Preta/M (no carrinho: 2).”
- Bloqueio: “Para deixar valor no fiado, escolha a cliente.”
- Rede: “Sem internet. Nada foi salvo. Tente de novo quando a conexão voltar.”

## 5. PWA

**Decisão:** PWA **instalável**, **sem modo off-line de dados**. Motivo: dá ícone na tela inicial e abre em tela cheia (cara de app)
com custo baixo; operar off-line exigiria sincronizar estoque e dinheiro entre aparelhos — risco alto e não pedido.

Configuração (`vite-plugin-pwa`):
- `registerType: 'prompt'` — quando houver versão nova, toast “Nova versão disponível · Atualizar”.
- Manifest: `name: "Estoque — <nome da loja>"`, `short_name: "Estoque"`, `display: "standalone"`, `start_url: "/"`, `lang: "pt-BR"`,
  `theme_color`/`background_color` do tema, ícones 192/512 + maskable.
- Workbox: precache apenas do app shell (HTML/JS/CSS/ícones). **`/api/*` = NetworkOnly** (nunca cachear dados).
- Página/estado off-line: banner e bloqueio de escrita (02 §3.8).
- Tela “Instalar no celular” em Configurações com instruções para Android (Chrome) e iPhone (Safari → Compartilhar → Adicionar à Tela de Início).
- Requer HTTPS (já garantido pelo Nginx).
- `sw.js` e `manifest.webmanifest` servidos com `Cache-Control: no-cache`.

Aplicativo nativo: fora do escopo atual. Se vier, o mesmo backend serve; o PWA cobre o uso de consulta no celular.
