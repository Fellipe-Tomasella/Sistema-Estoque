import { sql } from 'drizzle-orm'
import { boolean, check, integer, pgTable, text } from 'drizzle-orm/pg-core'
import { updatedAt } from './columns'

/** Linha única (id = 1) com a configuração da loja virtual (docs/11). */
export const storefrontSettings = pgTable(
  'storefront_settings',
  {
    id: integer().primaryKey().default(1),
    /** Site no ar. Desligado, só quem está logada vê (pré-visualização). */
    enabled: boolean().notNull().default(false),
    /** Caminho do site: `<sistema>/<slug>`. */
    slug: text(),
    /** Nome no site; vazio = nome da loja (store_settings). */
    title: text(),
    tagline: text(),
    /** Faixa de anúncio no topo do site (ex.: “Frete grátis acima de R$ 199”). */
    announcement: text(),
    about: text(),
    /** Só dígitos, com DDI (ex.: 5511999998888). */
    whatsapp: text(),
    instagram: text(),
    accentColor: text().notNull().default('#7c3aed'),
    /** Sem estoque: mostrar “esgotado” ou esconder o produto. */
    hideSoldOut: boolean().notNull().default(false),
    /** Quem recebe o aviso de pedido/interesse do site. */
    notifyEmail: text(),
    /** Finalizar pedido (RN-LOJ-10): aviso antes de enviar e o campo de observação. */
    checkoutNotice: text(),
    notesLabel: text(),
    notesRequired: boolean().notNull().default(false),
    updatedAt: updatedAt(),
  },
  (table) => [check('storefront_settings_single_row', sql`${table.id} = 1`)],
)

export type StorefrontSettings = typeof storefrontSettings.$inferSelect
