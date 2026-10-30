// Distribuição de um recebimento entre as dívidas da cliente (RN-FIA-04/05). Regras puras.
import { formatBRL } from '@estoque/shared'
import { BusinessRuleError, ValidationError } from '../../shared/errors'

export interface OpenDebt {
  id: string
  description: string
  balanceCents: number
}

export interface Allocation {
  receivableId: string
  amountCents: number
}

/** Sugestão: abate das dívidas mais antigas para as mais novas (a lista já vem ordenada). */
export function suggestAllocation(debts: OpenDebt[], amountCents: number): Allocation[] {
  const result: Allocation[] = []
  let left = amountCents
  for (const debt of debts) {
    if (left === 0) break
    const part = Math.min(left, debt.balanceCents)
    if (part > 0) result.push({ receivableId: debt.id, amountCents: part })
    left -= part
  }
  return result
}

/** Valida a distribuição escolhida pela dona: soma = valor recebido e cada parte ≤ saldo da dívida. */
export function validateAllocation(debts: OpenDebt[], amountCents: number, allocations: Allocation[]) {
  const totalOpen = debts.reduce((sum, debt) => sum + debt.balanceCents, 0)
  if (amountCents > totalOpen) {
    throw new BusinessRuleError(
      `O valor passa do total em aberto (${formatBRL(totalOpen)}). Crédito para compras futuras não está disponível.`,
    )
  }
  const byId = new Map(debts.map((debt) => [debt.id, debt]))
  const seen = new Set<string>()
  for (const allocation of allocations) {
    const debt = byId.get(allocation.receivableId)
    if (!debt) throw new ValidationError('Dívida não encontrada entre as dívidas em aberto desta cliente.')
    if (seen.has(debt.id)) throw new ValidationError(`${debt.description} aparece duas vezes na distribuição.`)
    seen.add(debt.id)
    if (allocation.amountCents > debt.balanceCents) {
      throw new ValidationError(
        `O valor para ${debt.description} passa do saldo da dívida (${formatBRL(debt.balanceCents)}).`,
      )
    }
  }
  const distributed = allocations.reduce((sum, allocation) => sum + allocation.amountCents, 0)
  if (distributed !== amountCents) {
    throw new ValidationError(
      `A soma distribuída (${formatBRL(distributed)}) precisa ser igual ao valor recebido (${formatBRL(amountCents)}).`,
    )
  }
}

/** Quanto vai para cada dívida e o saldo que fica (mostrado antes de salvar). */
export function previewAllocation(debts: OpenDebt[], allocations: Allocation[]) {
  const byId = new Map(allocations.map((a) => [a.receivableId, a.amountCents]))
  const lines = debts.map((debt) => {
    const allocated = byId.get(debt.id) ?? 0
    return {
      receivableId: debt.id,
      description: debt.description,
      balanceBeforeCents: debt.balanceCents,
      allocatedCents: allocated,
      balanceAfterCents: debt.balanceCents - allocated,
    }
  })
  return {
    lines,
    totalOpenBeforeCents: lines.reduce((sum, l) => sum + l.balanceBeforeCents, 0),
    totalOpenAfterCents: lines.reduce((sum, l) => sum + l.balanceAfterCents, 0),
  }
}
