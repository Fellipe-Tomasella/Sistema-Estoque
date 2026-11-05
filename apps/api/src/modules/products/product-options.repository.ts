import { sql } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client'

export type OptionKind = 'color' | 'size' | 'category'

/** Em uso: variação ativa de produto ativo (cor e tamanho) ou produto ativo (categoria). */
const USAGE = {
  color: sql`select v.color as value, (v.active and p.active) as in_use, p.name as product_name, 0 as sort
    from variants v join products p on p.id = v.product_id`,
  size: sql`select v.size as value, (v.active and p.active) as in_use, p.name as product_name, v.size_sort as sort
    from variants v join products p on p.id = v.product_id`,
  category: sql`select p.category as value, p.active as in_use, p.name as product_name, 0 as sort
    from products p where p.category is not null`,
}

/** Consultas das opções (cores, tamanhos, categorias) e das renomeações; sem regra de negócio. */
export class ProductOptionsRepository {
  constructor(private readonly db: DbOrTx) {}

  /** Cada valor com quantas peças ativas e inativas o usam, alguns produtos de exemplo e se foi excluído. */
  list(kind: OptionKind, tx: DbOrTx = this.db) {
    return tx.execute<{
      value: string
      active_count: number
      inactive_count: number
      products: string[]
      hidden: boolean
    }>(sql`
      with usage as (${USAGE[kind]})
      select u.value,
        count(*) filter (where u.in_use)::int as active_count,
        count(*) filter (where not u.in_use)::int as inactive_count,
        (array_agg(distinct u.product_name) filter (where u.in_use))[1:3] as products,
        exists (select 1 from hidden_options h where h.kind = ${kind} and lower(h.value) = lower(u.value)) as hidden
      from usage u
      group by u.value
      order by min(u.sort), lower(u.value)`)
  }

  /** Produtos que ficariam com cor+tamanho repetidos se `from` virasse `to`. */
  renameConflicts(kind: 'color' | 'size', from: string, to: string, tx: DbOrTx = this.db) {
    const [same, other] = kind === 'color' ? [sql`color`, sql`size`] : [sql`size`, sql`color`]
    return tx.execute<{ name: string }>(sql`
      select distinct p.name from variants a
      join variants b on b.product_id = a.product_id and b.id <> a.id
        and lower(b.${other}) = lower(a.${other}) and lower(b.${same}) = lower(${to})
      join products p on p.id = a.product_id
      where a.${same} = ${from}
      order by p.name limit 3`)
  }

  renameColor(from: string, to: string, tx: DbOrTx = this.db) {
    return tx.execute(sql`update variants set color = ${to}, updated_at = now() where color = ${from}`)
  }

  renameSize(from: string, to: string, sort: number, tx: DbOrTx = this.db) {
    return tx.execute(
      sql`update variants set size = ${to}, size_sort = ${sort}, updated_at = now() where size = ${from}`,
    )
  }

  renameCategory(from: string, to: string, tx: DbOrTx = this.db) {
    return tx.execute(sql`update products set category = ${to}, updated_at = now() where category = ${from}`)
  }

  hide(kind: OptionKind, value: string, tx: DbOrTx = this.db) {
    return tx.execute(sql`insert into hidden_options (id, kind, value) values (${Bun.randomUUIDv7()}, ${kind}, ${value})
      on conflict do nothing`)
  }

  unhide(kind: OptionKind, value: string, tx: DbOrTx = this.db) {
    return tx.execute(sql`delete from hidden_options where kind = ${kind} and lower(value) = lower(${value})`)
  }
}
