# 05 — Contrato da API

Base: `/api`. JSON. Autenticação por cookie `sid` (ver 02 §3.6). Valores em **centavos**, datas `YYYY-MM-DD`, instantes ISO-8601.
Erros no formato de 02 §3.4. Listas paginadas: `?page=1&pageSize=50` → `{ items, page, pageSize, total }`.
`Idempotency-Key` (uuid) obrigatório onde marcado **[IK]**.

O tipo `App` exportado em `apps/api/src/app.ts` alimenta o Eden Treaty no front — o contrato real é o código; este documento
é o mapa. Ao mudar uma rota, atualize aqui.

## Saúde
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | `{ ok, db, version }` — público |

## Auth (`modules/auth`)
| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/login` | `{ email, password }` → cookie + `{ user }`. Rate limit. |
| POST | `/auth/logout` | apaga sessão atual |
| POST | `/auth/logout-all` | apaga todas as sessões do usuário |
| GET | `/auth/me` | usuário atual ou 401 |
| POST | `/auth/forgot-password` | `{ email }` → sempre 200 (não revela se existe) |
| POST | `/auth/reset-password` | `{ token, password }` |
| POST | `/auth/change-password` | `{ current, next }` |

## Configurações (`modules/settings`)
| GET/PUT | `/settings/store` | dados da loja, fuso, UF, regime, rodapé, `fiscalRulesValidated` |

## Produtos (`modules/products`)
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/products` | `?q&color&size&category&status=active\|inactive\|all&stock=out\|low` — produtos com variações e saldos |
| GET | `/products/:id` | detalhe com variações |
| POST | `/products` | `{ name, basePriceCents, reference?, category?, costCents?, description?, variants: [{ color, size, priceCents?, initialQty?, minStock?, sku? }] }` |
| PATCH | `/products/:id` | campos do produto, inclusive os do site: `showOnSite`, `sitePriceCents` (null = preço do PDV), `hideSitePrice`, `siteDescription` (RN-LOJ-01 a 04) |
| POST | `/products/:id/variants` | adicionar variações (com `initialQty`) |
| PATCH | `/variants/:id` | cor, tamanho, preço, mínimo, sku, ativo |
| POST | `/products/:id/min-stock` | `{ minStock \| null }` para todas as variações |
| POST | `/products/:id/deactivate` · `/activate` | |
| DELETE | `/products/:id` · `/variants/:id` | só sem histórico (RN-PRO-08) |
| GET | `/products/suggestions` | cores, tamanhos e categorias já usados |
| GET | `/products/:id/images` | fotos na ordem (a primeira é a capa); o produto também traz `images` e `coverUrl` |
| POST | `/products/:id/images` | multipart `file` (JPG/PNG/WebP, até 15 MB) + `color?` — até 5 (RN-PRO-12) |
| POST | `/products/:id/images/order` | `{ ids }` com todas as fotos na nova ordem (RN-PRO-13) |
| PATCH · DELETE | `/products/:id/images/:imageId` | `{ color?, showOnSite? }` · excluir |
| GET | `/media/:id-thumb.webp` · `/media/:id-large.webp` | **sem login** (o site usa), cache longo |
| GET | `/variants/search` | `?q` — busca rápida para PDV e entradas (nome + cor + tamanho, só ativos, com saldo e preço efetivo) |

## Estoque (`modules/stock`)
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/products?stock=out\|low` | visão geral do estoque: a grade produto × cor × tamanho é montada na tela a partir das variações (decisão 022) |
| GET | `/stock/alerts` | contagens e lista de “sem estoque” e “repor” |
| GET | `/variants/:id/movements` | histórico (RN-EST-10) |
| GET | `/stock/movements` | histórico geral com filtros (período, tipo) |
| POST | `/stock/entries` | **[IK]** `{ entryDate, supplierName?, reference?, notes?, items: [{ variantId, quantity, unitCostCents? }] }` |
| GET | `/stock/entries` · `/stock/entries/:id` | |
| POST | `/stock/adjustments` | **[IK]** `{ variantId, reason: count\|loss\|damage\|error\|other, countedQty? , quantityDelta?, note? }` |
| GET | `/stock/import/template` | baixa modelo `.xlsx` |
| POST | `/stock/import/preview` | multipart arquivo → `{ batchId, summary, rows, errors }` |
| POST | `/stock/import/:batchId/commit` | `{ skipErrorRows: boolean }` — idempotente |
| POST | `/stock/import/:batchId/discard` | |

## Clientes (`modules/customers`)
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/customers` | `?q&withOpenBalance=true` — inclui `openBalanceCents` |
| GET | `/customers/:id` | dados + resumo de fiado |
| POST | `/customers` · PATCH `/customers/:id` | |
| POST | `/customers/:id/deactivate` · `/activate` | |

## Vendas (`modules/sales`)
| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/sales` | cria rascunho vazio → `{ id, version }` |
| GET | `/sales/drafts` | rascunhos abertos |
| GET | `/sales/:id` | venda completa: itens, pagamentos, dívida, devoluções, reembolsos, NF, linha do tempo |
| PATCH | `/sales/:id` | rascunho: `{ version, items?, customerId?, discount?: { kind, value }, payments?: [{ id, method, amountCents, confirmed, cardType?, installments?, cashGivenCents? }], fiado?: boolean, fiadoDueDate?, shipping?: { enabled, address?, uf?, trackingCode? }, notes?, fiscalRequested? }` → rascunho recalculado (`warnings`, `blockers`, `canConfirm`). `items` e `payments` substituem a lista inteira. |
| DELETE | `/sales/:id` | descarta rascunho |
| POST | `/sales/:id/confirm` | RN-VEN-07/08 → venda confirmada (`alreadyProcessed?`) |
| GET | `/sales` | histórico com filtros (`from,to,customerId,status,paymentStatus,shippingStatus,method,number`) |
| PATCH | `/sales/:id/shipping` | `{ status, trackingCode?, address?, uf? }` |
| PATCH | `/sales/:id/notes` | |
| POST | `/sales/:id/payments/:paymentId/change-method` | RN-PAG-05 `{ method, cardType?, reason }` |
| POST | `/sales/:id/fiscal-flag` | `{ requested: true }` — cliente pediu nota (RN-FIS-05) |
| GET | `/sales/:id/receipt.pdf` | comprovante |

## Cancelamento (`modules/cancellations`)
| GET | `/sales/:id/cancel-preview` | `?itemsWithStore=true\|false` → efeitos (RN-CAN-02) |
| POST | `/sales/:id/cancel` | `{ reason, itemsWithStore: boolean }` — idempotente |

## Devoluções e trocas (`modules/returns`)
| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/sales/:id/returns/preview` | `{ items: [{ saleItemId, quantity, received: boolean, condition? }], exchange?: { items: [{ variantId, quantity }], payments, fiadoDueDate? } }` → valores, abatimento de fiado, crédito, devolução de valor |
| POST | `/sales/:id/returns` | **[IK]** mesmo corpo — executa (devolução parcial ou troca) |
| GET | `/returns?status=awaiting_items` | pendências de retorno físico |
| POST | `/returns/:id/items/:itemId/receive` | `{ condition: sellable\|damaged }` — idempotente |
| GET | `/refunds?status=pending` | devoluções de valor pendentes |
| POST | `/refunds/:id/done` | **[IK]** `{ method, date }` |
| POST | `/refunds/:id/cancel` | `{ reason }` |

## Fiado (`modules/receivables`)
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/customers/:id/receivables` | dívidas abertas e quitadas com alocações e ajustes |
| POST | `/receipts/preview` | `{ customerId, amountCents, allocations? }` → sugestão/validação da distribuição |
| POST | `/receipts` | **[IK]** `{ customerId, date, method, cardType?, amountCents, allocations: [{ receivableId, amountCents }], notes? }` |
| GET | `/receipts/:id` | recebimento com dívidas abatidas e saldo restante |
| POST | `/receipts/:id/void` | `{ reason }` — idempotente |
| GET | `/receipts/:id/receipt.pdf` | comprovante do recebimento |
| POST | `/receivables/previous-balance` | **[A]** RN-FIA-11 (só se confirmado) |
| PATCH | `/receivables/:id` | `{ dueDate }` |

## Relatórios e fechamento (`modules/reports`)
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/reports/sales` | `?from&to&groupBy=day\|week\|month` |
| GET | `/reports/receivables` | fiado em aberto |
| GET | `/reports/products-ranking` | `?from&to&level=product\|variant&order=desc\|asc` |
| GET | `/reports/sales.csv` · `/reports/receivables.csv` · `/reports/products-ranking.csv` | exportação CSV (`;`, vírgula decimal, UTF-8 com BOM) |
| GET | `/closings/:date` | cálculo do dia + snapshot salvo + diferenças |
| PUT | `/closings/:date` | `{ countedCashCents, notes? }` salva/refaz |
| GET | `/dashboard` | dados do Início: alertas de estoque, rascunhos, envios pendentes, retornos pendentes, devoluções de valor pendentes, pendências fiscais, fiado em atraso, resumo de hoje |

## Fiscal (`modules/fiscal`)
| GET | `/fiscal/pending` | vendas `required`/`review` sem documento + documentos `cancel_pending` |
| POST | `/sales/:id/fiscal-documents` | registrar NF emitida fora |
| PATCH | `/fiscal-documents/:id` | corrigir dados / marcar `cancelled` (com data) |

## Exportação (`modules/exports`)
| GET | `/exports/full.zip` | RN-ACE-04 |

## Loja virtual (`modules/storefront`) — docs/11

| Método | Rota | Descrição |
| --- | --- | --- |
| GET · PUT | `/storefront/settings` | `{ enabled, slug, title, tagline, about, whatsapp, instagram, accentColor, hideSoldOut, notifyEmail }` |
| GET | `/<slug>` · `/<slug>?categoria=` · `/<slug>/p/:id/:nome` | **HTML** do site (fora de `/api`), sem login quando no ar (RN-LOJ-01) |
