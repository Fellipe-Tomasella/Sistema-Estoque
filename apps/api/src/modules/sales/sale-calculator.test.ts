import { describe, expect, test } from 'bun:test'
import type { DraftPayment } from '../../db/schema'
import { type CartInput, type CartLine, calculateCart } from './sale-calculator'

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  variantId: 'v1',
  productName: 'Blusa básica',
  variantLabel: 'Preta / M',
  unitPriceCents: 5000,
  quantity: 2,
  availableQty: 5,
  sellable: true,
  ...overrides,
})
const pay = (method: DraftPayment['method'], amountCents: number, extra: Partial<DraftPayment> = {}): DraftPayment => ({
  id: crypto.randomUUID(),
  method,
  amountCents,
  confirmed: method === 'cash',
  ...extra,
})
const cart = (overrides: Partial<CartInput> = {}) =>
  calculateCart({
    lines: [line()],
    discountKind: 'none',
    discountValue: 0,
    payments: [],
    fiado: false,
    customerId: null,
    ...overrides,
  })

describe('RN-VEN-04 desconto', () => {
  test('em reais', () => {
    expect(cart({ discountKind: 'amount', discountValue: 1500 })).toMatchObject({
      subtotalCents: 10000,
      discountCents: 1500,
      totalCents: 8500,
    })
  })

  test('percentual arredonda meio para cima', () => {
    // 10,5% de R$ 0,30 (3 × R$ 0,10) = 3,15 centavos → 3
    const result = cart({
      lines: [line({ unitPriceCents: 10, quantity: 3 })],
      discountKind: 'percent',
      discountValue: 1050,
    })
    expect(result.discountCents).toBe(3)
  })

  test('desconto acima do subtotal bloqueia e nunca deixa total negativo', () => {
    const result = cart({ discountKind: 'amount', discountValue: 20000 })
    expect(result.totalCents).toBe(0)
    expect(result.blockers).toContain('O desconto passa do valor das peças.')
  })
})

describe('RN-VEN-06 bloqueios da confirmação', () => {
  test('carrinho vazio', () => {
    expect(cart({ lines: [] }).blockers).toContain('Adicione pelo menos uma peça.')
  })

  test('falta pagamento', () => {
    expect(cart({ payments: [pay('cash', 4000)] }).blockers).toContain('Faltam R$ 60,00 para fechar o pagamento.')
  })

  test('Pix e cartão precisam ser marcados como recebidos', () => {
    const result = cart({ payments: [pay('pix', 5000), pay('card', 5000)] })
    expect(result.blockers).toEqual([
      'Confirme que o Pix foi recebido.',
      'Confirme que o cartão foi aprovado na maquininha.',
    ])
  })

  test('pagamentos acima do total', () => {
    expect(cart({ payments: [pay('cash', 12000)] }).blockers).toContain('Os pagamentos passam do total da venda.')
  })

  test('fiado exige cliente', () => {
    expect(cart({ fiado: true }).blockers).toEqual(['Para deixar valor no fiado, escolha a cliente.'])
  })

  test('variação que saiu de venda bloqueia', () => {
    expect(cart({ lines: [line({ sellable: false })] }).blockers[0]).toBe('Blusa básica Preta/M não está mais à venda.')
  })

  test('tudo certo: nenhum bloqueio', () => {
    expect(cart({ payments: [pay('pix', 4000, { confirmed: true }), pay('cash', 6000)] }).blockers).toEqual([])
  })
})

describe('RN-PAG', () => {
  test('RN-PAG-03 entrada + resto no fiado', () => {
    const result = cart({ payments: [pay('pix', 3000, { confirmed: true })], fiado: true, customerId: 'c1' })
    expect(result).toMatchObject({ paidCents: 3000, fiadoCents: 7000, blockers: [] })
  })

  test('RN-PAG-04 troco calculado do valor entregue', () => {
    const result = cart({ payments: [pay('cash', 10000, { cashGivenCents: 15000 })] })
    expect(result.payments[0]!.changeCents).toBe(5000)
  })

  test('RN-PAG-06 venda com 100% de desconto não precisa de pagamento', () => {
    expect(cart({ discountKind: 'percent', discountValue: 10000 }).blockers).toEqual([])
  })
})

test('RN-VEN-02 quantidade acima do saldo só avisa (a checagem que vale é na confirmação)', () => {
  const result = cart({ lines: [line({ quantity: 3, availableQty: 1 })], payments: [pay('cash', 15000)] })
  expect(result.warnings).toEqual(['Só há 1 unidade de Blusa básica Preta/M (no carrinho: 3).'])
  expect(result.blockers).toEqual([])
})
