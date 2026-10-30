import { MONEY_METHODS, type MoneyMethod } from '@estoque/shared'
import { db } from '../../db/client'
import { ValidationError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import type { SettingsService } from '../settings/settings.service'
import type { ClosingsRepository } from './closings.repository'

type ByMethod = Record<MoneyMethod, number>
const zero = (): ByMethod => ({ cash: 0, pix: 0, card: 0 })

/** RN-FEC-04: cartão é transação registrada, nunca saldo disponível. */
export const METHOD_LABELS: Record<MoneyMethod, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Transações de cartão registradas',
}

const flatten = (value: unknown, prefix = ''): [string, number][] =>
  Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    typeof child === 'number' ? [[`${prefix}${key}`, child]] : flatten(child, `${prefix}${key}.`),
  )

/**
 * Fechamento do dia (RN-FEC): vendas, recebimentos por forma (na venda / de fiado), devoluções de valor,
 * saldo por forma, crédito de troca à parte e dinheiro esperado × contado. Sem contas a pagar nem conciliação.
 */
export class ClosingsService {
  constructor(
    private readonly repo: ClosingsRepository,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async get(date: string) {
    await this.assertNotFuture(date)
    const computed = await this.compute(date)
    const saved = await this.repo.find(date)
    // RN-FEC-06: se algo do dia mudou depois de salvo, mostra as diferenças.
    const before = saved ? new Map(flatten(saved.snapshot)) : null
    const differences = before
      ? flatten(computed.totals)
          .filter(([field, after]) => before.get(field) !== after)
          .map(([field, after]) => ({ field, before: before.get(field) ?? 0, after }))
      : []
    return {
      date,
      ...computed,
      saved: saved
        ? {
            countedCashCents: saved.countedCashCents,
            expectedCashCents: saved.expectedCashCents,
            differenceCents: saved.differenceCents,
            notes: saved.notes,
            closedAt: saved.closedAt,
          }
        : null,
      changedAfterClosing: differences.length > 0,
      differences,
    }
  }

  /** Salva (ou refaz) o fechamento; o retrato anterior vai para o `audit_log`. */
  async save(date: string, input: { countedCashCents: number; notes?: string | null }, userId: string) {
    await this.assertNotFuture(date)
    const { totals } = await this.compute(date)
    await db.transaction(async (tx) => {
      const previous = await this.repo.find(date, tx)
      if (previous) {
        await this.audit.record(
          { entity: 'daily_closing', entityId: date, action: 'redo', before: previous, userId },
          tx,
        )
      }
      await this.repo.upsert(
        {
          businessDate: date,
          expectedCashCents: totals.expectedCashCents,
          countedCashCents: input.countedCashCents,
          differenceCents: input.countedCashCents - totals.expectedCashCents,
          snapshot: totals,
          notes: input.notes?.trim() || null,
          closedAt: new Date(),
          closedBy: userId,
        },
        tx,
      )
    })
    return this.get(date)
  }

  private async compute(date: string) {
    const store = await this.settings.get()
    const [sales, cancellations, payments, refunds, voids] = await Promise.all([
      this.repo.salesOfDay(date),
      this.repo.cancellationsOfDay(date),
      this.repo.paymentsOfDay(date),
      this.repo.refundsOfDay(date),
      this.repo.voidsOfDay(date, store.timezone),
    ])

    const atSale = zero()
    const fiado = zero()
    let exchangeCreditCents = 0
    for (const row of payments) {
      if (row.kind === 'exchange_credit') exchangeCreditCents += row.amount_cents
      else if (row.kind === 'sale_checkout') atSale[row.method as MoneyMethod] += row.amount_cents
      else fiado[row.method as MoneyMethod] += row.amount_cents
    }
    const refunded = zero()
    for (const row of refunds) refunded[row.method as MoneyMethod] += row.amount_cents

    const received = zero()
    const balance = zero()
    for (const method of MONEY_METHODS) {
      received[method] = atSale[method] + fiado[method]
      balance[method] = received[method] - refunded[method]
    }

    const totals = {
      sales: {
        count: sales.count,
        subtotalCents: sales.subtotal_cents,
        discountCents: sales.discount_cents,
        totalCents: sales.total_cents,
        fiadoCents: sales.fiado_cents,
      },
      receivedAtSale: atSale,
      receivedFiado: fiado,
      received,
      refunded,
      balance,
      // Crédito de troca não é dinheiro: aparece à parte (RN-FEC-03).
      exchangeCreditCents,
      // RN-FEC-05: dinheiro esperado = recebido − devolvido em dinheiro no dia.
      expectedCashCents: balance.cash,
    }
    return {
      totals,
      labels: METHOD_LABELS,
      cancellations: [...cancellations],
      voidedReceipts: [...voids],
    }
  }

  private async assertNotFuture(date: string) {
    if (date > (await this.settings.businessDate())) {
      throw new ValidationError('Não dá para fechar um dia que ainda não chegou.', { field: 'date' })
    }
  }
}
