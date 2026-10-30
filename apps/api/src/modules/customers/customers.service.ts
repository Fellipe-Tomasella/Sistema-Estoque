import { type DocumentType, isValidCnpj, isValidCpf, isValidUf, onlyDigits } from '@estoque/shared'
import type { DbOrTx } from '../../db/client'
import type { Address, Customer } from '../../db/schema'
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors'
import { isUniqueViolation } from '../../shared/sql'
import type { AuditService } from '../audit/audit.service'
import type { CustomersRepository, CustomerValues } from './customers.repository'
import type { CreateCustomerInput, ListCustomersFilters, UpdateCustomerInput } from './customers.schemas'

const text = (value: string | null | undefined) => (value?.trim() ? value.trim().replace(/\s+/g, ' ') : null)

/** Lista e busca sempre mostram algo além do nome, para diferenciar homônimos (RN-CLI-02). */
export function toCustomerDto(customer: Customer) {
  const detail = customer.phone ?? customer.email ?? customer.document
  return { ...customer, label: detail ? `${customer.name} · ${detail}` : customer.name }
}
export type CustomerDto = ReturnType<typeof toCustomerDto>

export class CustomersService {
  constructor(
    private readonly repo: CustomersRepository,
    private readonly audit: AuditService,
  ) {}

  async list(filters: ListCustomersFilters) {
    const result = await this.repo.list(filters)
    return { ...result, items: result.items.map(toCustomerDto) }
  }

  async get(id: string, tx?: DbOrTx) {
    return toCustomerDto(await this.require(id, tx))
  }

  /** RN-CLI-01: só o nome é obrigatório. Serve também ao cadastro rápido do PDV (RN-CLI-04). */
  async create(input: CreateCustomerInput) {
    const values = this.normalize(input) as CustomerValues
    return toCustomerDto(await this.withDocumentGuard(() => this.repo.insert(values)))
  }

  async update(id: string, input: UpdateCustomerInput) {
    await this.require(id)
    const updated = await this.withDocumentGuard(() => this.repo.update(id, this.normalize(input)))
    return toCustomerDto(updated!)
  }

  /** RN-CLI-05: cliente nunca é excluído, só inativado. */
  async setActive(id: string, active: boolean, userId: string) {
    const before = await this.require(id)
    if (before.active === active) return toCustomerDto(before)
    const after = await this.repo.update(id, { active })
    await this.audit.record({ entity: 'customer', entityId: id, action: active ? 'activate' : 'deactivate', userId })
    return toCustomerDto(after!)
  }

  async require(id: string, tx?: DbOrTx) {
    const customer = await this.repo.find(id, tx)
    if (!customer) throw new NotFoundError('Cliente não encontrado.')
    return customer
  }

  private normalize(input: UpdateCustomerInput): Partial<CustomerValues> {
    const values: Partial<CustomerValues> = {}
    if (input.name !== undefined) values.name = text(input.name)!
    if ('phone' in input) values.phone = text(input.phone)
    if ('email' in input) values.email = text(input.email)?.toLowerCase() ?? null
    if ('notes' in input) values.notes = input.notes?.trim() || null
    if ('document' in input || 'documentType' in input) Object.assign(values, this.normalizeDocument(input))
    if ('address' in input) values.address = this.normalizeAddress(input.address)
    return values
  }

  /** RN-CLI-03: CPF/CNPJ validados pelos dígitos verificadores; tipo deduzido pelo tamanho quando não vem. */
  private normalizeDocument(input: UpdateCustomerInput): {
    document: string | null
    documentType: DocumentType | null
  } {
    const document = input.document ? onlyDigits(input.document) : ''
    if (!document) return { document: null, documentType: null }
    const documentType = input.documentType ?? (document.length === 14 ? 'cnpj' : 'cpf')
    const valid = documentType === 'cnpj' ? isValidCnpj(document) : isValidCpf(document)
    if (!valid) {
      throw new ValidationError(`${documentType === 'cnpj' ? 'CNPJ' : 'CPF'} inválido.`, { field: 'document' })
    }
    return { document, documentType }
  }

  private normalizeAddress(address: Address | null | undefined): Address | null {
    if (!address) return null
    const normalized = Object.fromEntries(Object.entries(address).map(([key, value]) => [key, text(value)])) as Address
    if (normalized.zip) normalized.zip = onlyDigits(normalized.zip)
    if (normalized.uf) {
      normalized.uf = normalized.uf.toUpperCase()
      if (!isValidUf(normalized.uf)) throw new ValidationError('UF do endereço inválida.', { field: 'address.uf' })
    }
    return Object.values(normalized).some(Boolean) ? normalized : null
  }

  private async withDocumentGuard<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('Já existe um cliente com este CPF/CNPJ.')
      throw error
    }
  }
}
