import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { stockMovements, variants } from '../../db/schema'
import { services } from '../../container'
import { resetDatabase } from '../../../test/db'
import { createProduct, createUser } from '../../../test/factories'

let userId: string
beforeEach(async () => {
  await resetDatabase()
  userId = (await createUser()).id
})

const context = () => ({ businessDate: '2026-10-30', userId })

describe('StockService', () => {
  test('RN-EST-01 grava o movimento e atualiza o saldo na mesma transação', async () => {
    const product = await createProduct(userId, { variants: [['Preta', 'M', 3]] })
    const variantId = product.variants[0]!.id

    await db.transaction((tx) => services.stock.apply(tx, [{ variantId, type: 'purchase_entry', delta: 4 }], context()))

    const [variant] = await db.select().from(variants).where(eq(variants.id, variantId))
    expect(variant!.stockQty).toBe(7)
    const movements = await db.select().from(stockMovements).where(eq(stockMovements.variantId, variantId))
    expect(movements.map((m) => [m.quantityDelta, m.balanceAfter])).toEqual([
      [3, 3],
      [4, 7],
    ])
  })

  test('RN-EST-07 saldo nunca fica negativo: nada é gravado e a mensagem diz quanto há', async () => {
    const product = await createProduct(userId, { name: 'Blusa básica', variants: [['Preta', 'M', 2]] })
    const variantId = product.variants[0]!.id

    const attempt = db.transaction((tx) =>
      services.stock.apply(tx, [{ variantId, type: 'adjustment', delta: -3, adjustmentReason: 'loss' }], context()),
    )
    expect(attempt).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      message: 'Só há 2 unidades de Blusa básica Preta/M.',
    })
    await attempt.catch(() => {})

    const [variant] = await db.select().from(variants).where(eq(variants.id, variantId))
    expect(variant!.stockQty).toBe(2)
    expect(await db.select().from(stockMovements)).toHaveLength(1)
  })

  test('vários movimentos da mesma variação acumulam o saldo em ordem', async () => {
    const product = await createProduct(userId, { variants: [['Preta', 'M', 1]] })
    const variantId = product.variants[0]!.id
    const rows = await db.transaction((tx) =>
      services.stock.apply(
        tx,
        [
          { variantId, type: 'purchase_entry', delta: 2 },
          { variantId, type: 'adjustment', delta: -3, adjustmentReason: 'damage' },
        ],
        context(),
      ),
    )
    expect(rows.map((r) => r.balanceAfter)).toEqual([3, 0])
  })

  test('o banco também barra saldo negativo (CHECK), mesmo fora do StockService', async () => {
    const product = await createProduct(userId, { variants: [['Preta', 'M', 1]] })
    const update = db.update(variants).set({ stockQty: -1 }).where(eq(variants.id, product.variants[0]!.id)).execute()
    expect(update).rejects.toThrow()
    await update.catch(() => {})
  })
})
