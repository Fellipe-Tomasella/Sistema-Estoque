import { normalizeSize, sizeSort } from '@estoque/shared'
import { db } from '../../db/client'
import { BusinessRuleError, ConflictError, ValidationError } from '../../shared/errors'
import type { AuditService } from '../audit/audit.service'
import type { OptionKind, ProductOptionsRepository } from './product-options.repository'

const cleanText = (value: string) => value.trim().replace(/\s+/g, ' ')
const NAMES = { color: 'cor', size: 'tamanho', category: 'categoria' } as const
const WITH = { color: 'a cor', size: 'o tamanho', category: 'a categoria' } as const
const list = (names: string[]) => names.map((n) => `“${n}”`).join(', ')

/**
 * RN-PRO-17: aba Opções — as cores, tamanhos e categorias que aparecem nas sugestões. Renomear corrige o valor em todas
 * as peças (vendas antigas mantêm o rótulo, RN-PRO-09); excluir só é permitido quando nenhuma peça ativa usa o valor.
 */
export class ProductOptionsService {
  constructor(
    private readonly repo: ProductOptionsRepository,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const [colors, sizes, categories] = await Promise.all(
      (['color', 'size', 'category'] as const).map(async (kind) =>
        [...(await this.repo.list(kind))]
          // excluída e sem peça ativa: some; se uma peça ativa voltou a usar, aparece de novo
          .filter((o) => !o.hidden || o.active_count > 0)
          .map((o) => ({
            value: o.value,
            activeCount: o.active_count,
            inactiveCount: o.inactive_count,
            products: o.products ?? [],
          })),
      ),
    )
    return { colors: colors!, sizes: sizes!, categories: categories! }
  }

  /** Valores para as sugestões dos formulários (só os não excluídos). */
  async suggestions() {
    const options = await this.list()
    return {
      colors: options.colors.map((o) => o.value),
      sizes: options.sizes.map((o) => o.value),
      categories: options.categories.map((o) => o.value),
    }
  }

  async rename(kind: OptionKind, input: { from: string; to: string }, userId: string) {
    const to = kind === 'size' ? normalizeSize(input.to) : cleanText(input.to)
    if (!to) throw new ValidationError(`Informe o novo nome (${NAMES[kind]}).`)
    if (to === input.from) return this.list()
    await db.transaction(async (tx) => {
      if (kind !== 'category' && to.toLowerCase() !== input.from.toLowerCase()) {
        const conflicts = [...(await this.repo.renameConflicts(kind, input.from, to, tx))].map((r) => r.name)
        if (conflicts.length) {
          throw new ConflictError(
            `Não dá para trocar: ${list(conflicts)} já tem “${to}” com ${kind === 'color' ? 'o mesmo tamanho' : 'a mesma cor'}. ` +
              'Ajuste essa peça no produto antes.',
          )
        }
      }
      if (kind === 'color') await this.repo.renameColor(input.from, to, tx)
      else if (kind === 'size') await this.repo.renameSize(input.from, to, sizeSort(to), tx)
      else await this.repo.renameCategory(input.from, to, tx)
      await this.repo.unhide(kind, to, tx)
      await this.audit.record(
        {
          entity: 'product_option',
          action: 'rename',
          before: { kind, value: input.from },
          after: { kind, value: to },
          userId,
        },
        tx,
      )
    })
    return this.list()
  }

  async remove(kind: OptionKind, value: string, userId: string) {
    await db.transaction(async (tx) => {
      const option = [...(await this.repo.list(kind, tx))].find((o) => o.value === value)
      if (option && option.active_count > 0) {
        const what = kind === 'category' ? 'produto ativo' : 'peça ativa'
        throw new BusinessRuleError(
          `Ainda há ${option.active_count} ${what}${option.active_count === 1 ? '' : 's'} com ${WITH[kind]} “${value}” ` +
            `(${list(option.products ?? [])}). Troque ou inative essas peças antes de excluir.`,
        )
      }
      await this.repo.hide(kind, value, tx)
      await this.audit.record({ entity: 'product_option', action: 'delete', before: { kind, value }, userId }, tx)
    })
    return this.list()
  }
}
