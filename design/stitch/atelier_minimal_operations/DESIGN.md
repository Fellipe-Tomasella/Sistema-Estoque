---
name: Atelier Minimal Operations
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fd'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1ec'
  on-surface: '#1a1b22'
  on-surface-variant: '#464555'
  inverse-surface: '#2f3038'
  inverse-on-surface: '#f1effa'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4c'
  on-tertiary-container: '#7df1bd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1ec'
typography:
  display:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: '0'
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: '0'
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-xs:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-num:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: '0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

O design system estabelece uma experiência de software como serviço (SaaS) operacional e refinada, sob medida para a gestão diária de uma boutique independente de moda. O tom visual equilibra o rigor utilitário de ferramentas modernas de produtividade com a sofisticação silenciosa do varejo contemporâneo.

### Personalidade e Atributos de Marca
- **Eficiente e Direto:** Reduz o atrito cognitivo para que a proprietária tome decisões rápidas entre atendimento, estoque e fechamento de caixa.
- **Elegante e Contido:** Elimina excessos visuais, mantendo o foco nas peças, métricas e tarefas pendentes.
- **Confiável e Organizado:** Transmite precisão contábil e controle operacional em cada tabela e indicador.

### Movimento Estético
A abordagem adotada combina **Modern Corporate / Utilitarian Minimalism**, fortemente orientada pelo vocabulário de `shadcn/ui` e `Tailwind CSS`. A interface prioriza telas respiráveis, contraste nítido, superfícies brancas sobre telas em tom off-white suave, microinterações precisas e hierarquia tipográfica estrita.

## Colors

A paleta foi desenhada para garantir máxima legibilidade em jornadas diárias contínuas em modo claro (`light mode`), minimizando cansaço visual e comunicando prioridades operacionais sem ruído.

### Fundos e Superfícies
- **Canvas / Fundo Geral:** `#fafafa` (`zinc-50`), criando contraste sutil com painéis de dados.
- **Superfície / Cards / Modais:** `#ffffff` (`white`) puro.
- **Bordas Estruturais:** `#e4e4e7` (`zinc-200`) para divisórias, tabelas e contornos de cards.
- **Bordas Sutis / Hover:** `#d4d4d8` (`zinc-300`).

### Tons Principais
- **Primary (`#4f46e5` / `indigo-600`):** Utilizado para ações primárias, estados ativos de navegação, seletores de filtro e anéis de foco acessíveis.
- **Secondary (`#0f172a` / `slate-900`):** Usado para títulos de alto impacto, botões primários de finalização/registro e tipografia base de alta densidade.
- **Neutral Base:** Da escala Zinc (`#09090b` para texto principal, `#71717a` para legendas secundárias e labels auxiliares).

### Semântica de Operação e Badges
Cada status operacional utiliza tripla codificação (fundo pastel suave, texto de alto contraste e borda de contenção):
- **Alerta Crítico (`Sem estoque`, `Em atraso`, `Cancelada`):**
  - Fundo: `#fee2e2` (`red-100`)
  - Texto: `#b91c1c` (`red-700`)
  - Borda: `#fecaca` (`red-200`)
- **Atenção Operacional (`Repor`, `Pendente`, `Aguardando`):**
  - Fundo: `#fef3c7` (`amber-100`)
  - Texto: `#92400e` (`amber-800`)
  - Borda: `#fde68a` (`amber-200`)
- **Sucesso / Concluído (`Pago`, `Confirmada`, `Entregue`):**
  - Fundo: `#d1fae5` (`emerald-100`)
  - Texto: `#065f46` (`emerald-800`)
  - Borda: `#a7f3d0` (`emerald-200`)
- **Neutro / Estável (`Rascunho`, `Inativo`):**
  - Fundo: `#f4f4f5` (`zinc-100`)
  - Texto: `#3f3f46` (`zinc-700`)
  - Borda: `#e4e4e7` (`zinc-200`)

## Typography

A tipografia utiliza a família **Geist** por sua precisão técnica, proporções equilibradas e excelente legibilidade em tabelas numéricas e listas densas. Alternativamente, `Inter` pode ser aplicada como fallback imediato sem perdas estruturais.

### Regras de Aplicação
- **Alinhamento Numérico:** Valores monetários e quantitativos em tabelas e resumos de venda devem aplicar `font-feature-settings: "tnum"` (tabular figures) para manter o alinhamento das colunas decimais.
- **Formatação pt-BR:**
  - Valores monetários: `R$ 1.234,56` (espaço não quebrável entre símbolo e montante).
  - Datas e horas: `dd/mm/aaaa` e `hh:mm` (ex.: `14/04/2025 às 15:30`).
  - Quantidades fracionárias ou peças: inteiros simples sem zeros supérfluos (ex.: `12 un`).
- **Hierarquia Visual:** Rótulos de campos usam `label-sm` com peso 500 em tom `zinc-700`. Cabeçalhos de seção e métricas de painel usam `headline-md` e `display` em peso 600 com espaçamento de letras ligeiramente negativo para maior coesão visual.

## Layout & Spacing

O layout adota uma grade fluida estruturada sobre o grid de 12 colunas, combinando um menu lateral de navegação fixa (`sidebar` de 240px colapsável em telas menores) com área de trabalho expansível.

### Breakpoints e Comportamento Responsivo
- **Mobile (`< 768px`):** Layout em coluna única. A barra lateral é convertida em um drawer deslizante via acionador superior. As margens externas reduzem para `1rem` (`16px`), e tabelas de catálogo/vendas ganham rolagem horizontal com colunas de identificação fixas (`sticky`).
- **Tablet (`768px - 1024px`):** Margem externa de `1.5rem` (`24px`). O grid opera em 8 colunas com gutters de `1rem`. Blocos de indicadores (KPIs) quebram em pares 2x2.
- **Desktop (`>= 1025px`):** Margem externa de `2.5rem` (`40px`), permitindo acomodar o painel operacional completo com densidade sem compressão visual.

### Ritmo Espaçador Interno
- **Densidade em Componentes:** A densidade é mantida equilibrada com `space-xs` (4px) e `space-sm` (8px) para lacunas entre ícones e textos; `space-md` (12px) para paddings verticais em botões e células; e `space-xl` (24px) para respiro interno de cartões de resumo.

## Elevation & Depth

A profundidade é expressa primordialmente por **contornos de baixo contraste** aliados a **sombras difusas quase imperceptíveis** (`shadow-sm`), inspiradas na convenção visual do `shadcn/ui`. Não há uso de sombras agressivas ou gradientes multicoloridos.

### Níveis de Elevação
- **Nível 0 (Superfície Base):** O canvas do sistema (`#fafafa` / `zinc-50`), plano e estático.
- **Nível 1 (Cartões e Painéis):** Fundo `#ffffff`, contorno linear de 1px em `#e4e4e7` (`zinc-200`) e sombra leve:
  `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);` (`shadow-sm`).
- **Nível 2 (Popovers, Dropdowns e Tooltips):** Fundo `#ffffff`, borda `#e4e4e7` e sombra flutuante refinada:
  `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04);`.
- **Nível 3 (Diálogos Modais e Sheets de Pedido):** Sobreposição com backdrop esmaecido (`bg-black/40` com desfoque de 2px) e caixa modal centralizada sustentada por:
  `box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.06);`.

## Shapes

O sistema utiliza a escala de cantos suaves `rounded-md` (6px / `0.375rem`) como padrão geral para elementos interativos e cartões internos, estendendo-se a `rounded-lg` (8px / `0.5rem`) para invólucros de maior porte e modais.

### Diretrizes de Aplicação
- **Inputs, Botões e Selects:** `rounded-md` (6px) para manter um perfil conciso, moderno e limpo.
- **Cards, Tabelas e Painéis:** `rounded-lg` (8px) em contêineres externos com borda delimitada.
- **Badges de Status:** `rounded-md` (6px) para manter harmonia com a geometria dos botões, evitando pill-shapes excessivamente lúdicos e preservando a seriedade do software.
- **Diálogos Modais:** `rounded-lg` (8px).

## Components

### Botões (Buttons)
- **Primary:** Fundo `#0f172a` (`slate-900`), texto `#ffffff`, hover em `#1e293b` (`slate-800`), altura de 36px (`h-9`), padding horizontal de 16px (`px-4`), texto `label-sm`.
- **Secondary:** Fundo `#f4f4f5` (`zinc-100`), texto `#18181b` (`zinc-900`), borda transparente, hover em `#e4e4e7` (`zinc-200`).
- **Outline:** Fundo transparente, borda de 1px `#e4e4e7` (`zinc-200`), texto `#09090b`, hover em `#f4f4f5`.
- **Ghost:** Fundo transparente, texto `#71717a`, hover em `#f4f4f5` e texto `#09090b`.
- **Destructive:** Fundo `#fee2e2` (`red-100`), texto `#b91c1c` (`red-700`), borda `#fecaca` (`red-200`), hover em `#fecaca`.

### Campos de Entrada (Input Fields) & Seletores
- **Construção:** Altura fixa de 36px (`h-9`), borda 1px `#e4e4e7` (`zinc-200`), fundo `#ffffff`, texto `body-md` em `#09090b`.
- **Placeholder:** Texto `#a1a1aa` (`zinc-400`).
- **Estado de Foco:** Contorno outline desabilitado, transição suave para anel duplo: `ring-2 ring-indigo-500/20 border-indigo-600`.
- **Inputs Monetários (R$):** Prefixo fixo `R$` alinhado à esquerda em `#71717a` com divisor vertical sutil, seguido por alinhamento à direita dos dígitos numéricos tabulares.

### Badges e Indicadores de Estado
Todos os badges devem exibir texto explícito em caixa normal legível (sem apenas círculos ou códigos crípticos):
- **Altura e Espaçamento:** Altura de 22px, padding horizontal de 8px (`px-2`), cantos `rounded-md`. Tipografia `label-xs` com peso 500.
- **Exemplos Obrigatórios:**
  - Crítico: `Sem estoque`, `Em atraso`, `Cancelada` (fundo `red-100`, texto `red-700`, borda `red-200`).
  - Atenção: `Repor`, `Pendente`, `Aguardando` (fundo `amber-100`, texto `amber-800`, borda `amber-200`).
  - Sucesso: `Pago`, `Confirmada`, `Entregue` (fundo `emerald-100`, texto `emerald-800`, borda `emerald-200`).
  - Neutro: `Rascunho`, `Inativo` (fundo `zinc-100`, texto `zinc-700`, borda `zinc-200`).

### Tabelas de Dados Operacionais
- **Cabeçalho:** Fundo `#fafafa` (`zinc-50`), texto `label-xs` em maiúsculas suaves (`tracking-wider text-zinc-500`), altura de 40px, borda inferior de 1px `#e4e4e7`.
- **Linhas (Rows):** Fundo `#ffffff`, altura média de 48px, borda inferior de 1px `#f4f4f5` (`zinc-100`), hover suave com transição para `#fafafa`.
- **Alinhamentos:** Texto à esquerda; códigos, datas e status centralizados; montantes monetários e quantidades rigorosamente à direita.

### Cartões de Aviso Operacional (Alert Callouts)
- Contêiner retangular de cantos `rounded-md` com borda lateral esquerda de 3px em destaque temático ou contorno total fino.
- Usado para alertas de estoque crítico ou conciliação bancária pendente antes do encerramento da jornada.
- Exibe ícone utilitário sutil de 16px à esquerda, título resumido em `label-sm` e ação rápida em formato inline (`text-button`).

### Caixas de Seleção (Checkboxes) & Opções
- Caixa com 16x16px, cantos `rounded` (4px), borda 1px `#d4d4d8` (`zinc-300`).
- Estado checado: fundo `#0f172a` (`slate-900`) ou `#4f46e5` (`indigo-600`) com ícone check em branco puro.

### Navegação, Breadcrumbs e Cabeçalhos
- **Cabeçalho Superior:** Altura de 56px, fundo branco translúcido (`bg-white/80 backdrop-blur`), linha divisória inferior em `#e4e4e7`.
- **Breadcrumb:** Caminho modular em `label-sm`, itens intermediários em `#71717a` separados por barra `/` (`zinc-300`), item terminal ativo em `#09090b` (`font-medium`).