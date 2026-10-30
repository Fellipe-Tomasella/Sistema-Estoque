import type { IntegrityRepository } from './integrity.repository'

export interface IntegrityCheck {
  name: string
  ok: boolean
  problems: unknown[]
}

/** Verifica os invariantes do banco. Cada etapa acrescenta as checagens do seu domínio. */
export class IntegrityService {
  constructor(private readonly repo: IntegrityRepository) {}

  async run(): Promise<IntegrityCheck[]> {
    const checks: [string, () => Promise<unknown[]>][] = [
      ['1. Saldo das variações = soma dos movimentos', () => this.repo.stockMismatches()],
      ['2. Valor pago das dívidas = soma dos recebimentos válidos', () => this.repo.receivablePaidMismatches()],
      ['6. Situação de pagamento da venda coerente com o fiado', () => this.repo.salePaymentStatusMismatches()],
    ]
    return Promise.all(
      checks.map(async ([name, query]) => {
        const problems = [...(await query())]
        return { name, ok: problems.length === 0, problems }
      }),
    )
  }
}
