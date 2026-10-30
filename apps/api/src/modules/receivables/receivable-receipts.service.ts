import { formatBRL } from '@estoque/shared'
import { db } from '../../db/client'
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors'
import { isUniqueViolation } from '../../shared/sql'
import type { AuditService } from '../audit/audit.service'
import type { CustomersService } from '../customers/customers.service'
import type { PaymentsRepository } from '../payments/payments.repository'
import type { SettingsService } from '../settings/settings.service'
import { type OpenDebt, previewAllocation, suggestAllocation, validateAllocation } from './allocation'
import type { ReceivablesRepository } from './receivables.repository'
import type { CreateReceiptInput, ReceiptPreviewInput } from './receivables.schemas'
import type { ReceivablesService } from './receivables.service'

/**
 * Recebimento de fiado (RN-FIA-04…09): não cria venda nem mexe no estoque; abate só as dívidas escolhidas.
 * O `id` do recebimento é a Idempotency-Key: reenviar devolve o mesmo registro.
 */
export class ReceivableReceiptsService {
  constructor(
    private readonly repo: ReceivablesRepository,
    private readonly receivables: ReceivablesService,
    private readonly payments: PaymentsRepository,
    private readonly customers: CustomersService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** Mostra antes de salvar quanto vai para cada dívida e o saldo que fica. */
  async preview(input: ReceiptPreviewInput) {
    const customer = await this.customers.require(input.customerId)
    const debts = (await this.repo.byCustomer(input.customerId)).filter((d) => d.status === 'open')
    const allocations = input.allocations ?? suggestAllocation(debts, input.amountCents)
    validateAllocation(debts, input.amountCents, allocations)
    const preview = previewAllocation(debts, allocations)
    return {
      allocations,
      ...preview,
      message: `Saldo de ${customer.name} passa de ${formatBRL(preview.totalOpenBeforeCents)} para ${formatBRL(preview.totalOpenAfterCents)}.`,
    }
  }

  async create(id: string, input: CreateReceiptInput, userId: string) {
    const existing = await this.payments.find(id)
    if (existing) {
      if (existing.kind !== 'receivable_receipt') throw new ConflictError('Esta chave já foi usada em outro registro.')
      return { ...(await this.view(id)), alreadyProcessed: true }
    }

    const today = await this.settings.businessDate()
    const date = input.date ?? today
    if (date > today) throw new ValidationError('A data do recebimento não pode ser no futuro.', { field: 'date' })
    await this.customers.require(input.customerId)

    try {
      await db.transaction(async (tx) => {
        const debts = await this.repo.openByCustomerLocked(input.customerId, tx)
        validateAllocation(debts as OpenDebt[], input.amountCents, input.allocations)

        await this.payments.insertMany(
          [
            {
              id,
              kind: 'receivable_receipt',
              method: input.method,
              cardType: input.method === 'card' ? (input.cardType ?? null) : null,
              amountCents: input.amountCents,
              customerId: input.customerId,
              businessDate: date,
              notes: input.notes?.trim() || null,
              createdBy: userId,
            },
          ],
          tx,
        )
        await this.repo.insertAllocations(
          input.allocations.map((a) => ({ paymentId: id, receivableId: a.receivableId, amountCents: a.amountCents })),
          tx,
        )
        const byId = new Map(debts.map((d) => [d.id, d]))
        for (const allocation of input.allocations) {
          await this.receivables.applyPaid(tx, byId.get(allocation.receivableId)!, allocation.amountCents)
        }
      })
    } catch (error) {
      if (isUniqueViolation(error)) return { ...(await this.view(id)), alreadyProcessed: true }
      throw error
    }
    return { ...(await this.view(id)), alreadyProcessed: false }
  }

  /** RN-FIA-07: estorno de recebimento lançado por engano. Nada é apagado; os saldos voltam. */
  async void(id: string, reason: string, userId: string) {
    await db.transaction(async (tx) => {
      const payment = await this.payments.find(id, tx, true)
      if (!payment || payment.kind !== 'receivable_receipt') throw new NotFoundError('Recebimento não encontrado.')
      if (payment.status === 'voided') return

      await this.payments.update(
        id,
        { status: 'voided', voidedAt: new Date(), voidReason: reason.trim(), voidedBy: userId },
        tx,
      )
      const allocations = (await this.repo.allocationsByPayment(id, tx)).sort((a, b) =>
        a.receivableId.localeCompare(b.receivableId),
      )
      for (const allocation of allocations) {
        const receivable = await this.repo.find(allocation.receivableId, tx, true)
        await this.receivables.applyPaid(tx, receivable!, -allocation.amountCents)
      }
      await this.audit.record({ entity: 'payment', entityId: id, action: 'void', reason: reason.trim(), userId }, tx)
    })
    return this.view(id)
  }

  async view(id: string) {
    const payment = await this.payments.find(id)
    if (!payment || payment.kind !== 'receivable_receipt') throw new NotFoundError('Recebimento não encontrado.')
    const customer = await this.customers.get(payment.customerId!)
    const allocations = await this.repo.allocationsByPayment(id)
    const debts = await this.repo.byCustomer(payment.customerId!)
    const byId = new Map(debts.map((d) => [d.id, d]))
    return {
      id: payment.id,
      customer: { id: customer.id, name: customer.name, label: customer.label },
      method: payment.method,
      cardType: payment.cardType,
      amountCents: payment.amountCents,
      businessDate: payment.businessDate,
      receivedAt: payment.receivedAt,
      status: payment.status,
      voidReason: payment.voidReason,
      notes: payment.notes,
      allocations: allocations.map((a) => {
        const debt = byId.get(a.receivableId)!
        return {
          receivableId: a.receivableId,
          description: debt.description,
          amountCents: a.amountCents,
          balanceCents: debt.balanceCents,
        }
      }),
      openBalanceCents: debts.filter((d) => d.status === 'open').reduce((sum, d) => sum + d.balanceCents, 0),
    }
  }
}
