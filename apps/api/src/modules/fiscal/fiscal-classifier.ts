// Classificação fiscal da venda na confirmação (RN-FIS-01…05). O sistema organiza e sinaliza; não emite nota.
import type { BuyerType, FiscalRequirement } from '@estoque/shared'

export interface FiscalInput {
  customerDocumentType: 'cpf' | 'cnpj' | null
  fiscalRequested: boolean
  hasShipping: boolean
  shippingUf: string | null
  storeUf: string | null
}

export interface FiscalClassification {
  buyerType: BuyerType
  requirement: FiscalRequirement
  note: string
}

export function classifyFiscal(input: FiscalInput): FiscalClassification {
  const buyerType: BuyerType = input.customerDocumentType === 'cnpj' ? 'company_pj' : 'consumer_pf'

  if (buyerType === 'company_pj') {
    return { buyerType, requirement: 'required', note: 'Venda para CNPJ: MEI deve emitir NF-e.' }
  }
  if (input.fiscalRequested) {
    return { buyerType, requirement: 'required', note: 'Cliente pediu nota fiscal.' }
  }
  if (input.hasShipping && input.shippingUf && input.storeUf && input.shippingUf !== input.storeUf) {
    return {
      buyerType,
      requirement: 'review',
      note: 'Envio para outro estado: confirmar com o contador se a mercadoria precisa de nota para o transporte.',
    }
  }
  return {
    buyerType,
    requirement: 'not_required',
    note: 'Consumidor pessoa física — dispensa de nota individual para MEI; confirmar com o contador.',
  }
}
