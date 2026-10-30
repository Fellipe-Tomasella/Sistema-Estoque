import { isValidUf } from '@estoque/shared'
import type { Address } from '../../db/schema'
import { ValidationError } from '../../shared/errors'

const text = (value: string | null | undefined) => (value?.trim() ? value.trim() : null)

interface ShippingInput {
  address?: Address | null
  uf?: string | null
  trackingCode?: string | null
}

/**
 * Endereço, UF de destino e rastreio do envio (RN-ENV-01). Só os campos enviados mudam;
 * a UF, se não vier, é a do endereço.
 */
export function normalizeShipping(input: ShippingInput, currentAddress: Address | null) {
  const changes: { shippingAddress?: Address | null; shippingUf?: string | null; trackingCode?: string | null } = {}
  if ('address' in input) changes.shippingAddress = input.address ?? null
  if ('trackingCode' in input) changes.trackingCode = text(input.trackingCode)

  const address = 'address' in input ? (input.address ?? null) : currentAddress
  if ('uf' in input || 'address' in input) {
    const uf = (text(input.uf) ?? text(address?.uf))?.toUpperCase() ?? null
    if (uf && !isValidUf(uf)) throw new ValidationError('UF de destino inválida.', { field: 'uf' })
    changes.shippingUf = uf
  }
  return changes
}
