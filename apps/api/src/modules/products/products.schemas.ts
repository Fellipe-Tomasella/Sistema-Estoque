import { t } from 'elysia'
import { OneOf } from '../../shared/schemas'

const Cents = t.Integer({ minimum: 0, maximum: 100_000_000 })
const Quantity = t.Integer({ minimum: 0, maximum: 1_000_000 })
const OptionalText = (maxLength: number) => t.Optional(t.Nullable(t.String({ maxLength })))
const Label = t.String({ minLength: 1, maxLength: 40 })

export const NewVariantBody = t.Object({
  color: Label,
  size: Label,
  priceCents: t.Optional(t.Nullable(Cents)),
  costCents: t.Optional(t.Nullable(Cents)),
  sku: OptionalText(60),
  initialQty: t.Optional(Quantity),
  minStock: t.Optional(t.Nullable(Quantity)),
})
export type NewVariantInput = typeof NewVariantBody.static

export const CreateProductBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  basePriceCents: Cents,
  reference: OptionalText(60),
  category: OptionalText(60),
  description: OptionalText(1000),
  costCents: t.Optional(t.Nullable(Cents)),
  variants: t.Array(NewVariantBody, { minItems: 1, maxItems: 300 }),
})
export type CreateProductInput = typeof CreateProductBody.static

export const UpdateProductBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  basePriceCents: t.Optional(Cents),
  reference: OptionalText(60),
  category: OptionalText(60),
  description: OptionalText(1000),
  costCents: t.Optional(t.Nullable(Cents)),
  // loja virtual (RN-LOJ-01 a 04)
  showOnSite: t.Optional(t.Boolean()),
  sitePriceCents: t.Optional(t.Nullable(Cents)),
  hideSitePrice: t.Optional(t.Boolean()),
  siteDescription: OptionalText(2000),
})
export type UpdateProductInput = typeof UpdateProductBody.static

export const AddVariantsBody = t.Object({ variants: t.Array(NewVariantBody, { minItems: 1, maxItems: 300 }) })

export const UpdateVariantBody = t.Object({
  color: t.Optional(Label),
  size: t.Optional(Label),
  priceCents: t.Optional(t.Nullable(Cents)),
  costCents: t.Optional(t.Nullable(Cents)),
  sku: OptionalText(60),
  minStock: t.Optional(t.Nullable(Quantity)),
  active: t.Optional(t.Boolean()),
})
export type UpdateVariantInput = typeof UpdateVariantBody.static

export const MinStockBody = t.Object({ minStock: t.Nullable(Quantity) })

export const ListProductsQuery = t.Object({
  q: t.Optional(t.String({ maxLength: 100 })),
  color: t.Optional(t.String({ maxLength: 40 })),
  size: t.Optional(t.String({ maxLength: 40 })),
  category: t.Optional(t.String({ maxLength: 60 })),
  status: t.Optional(OneOf(['active', 'inactive', 'all'])),
  stock: t.Optional(OneOf(['out', 'low'])),
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  pageSize: t.Optional(t.Integer({ minimum: 1, maximum: 200, default: 50 })),
})
export type ListProductsFilters = typeof ListProductsQuery.static

export const SearchVariantsQuery = t.Object({
  q: t.String({ minLength: 1, maxLength: 100 }),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 50, default: 20 })),
})

export const IdParams = t.Object({ id: t.String({ format: 'uuid' }) })

export const ImageParams = t.Object({ id: t.String({ format: 'uuid' }), imageId: t.String({ format: 'uuid' }) })

export const UploadImageBody = t.Object({
  file: t.File({ maxSize: '15m' }),
  color: t.Optional(t.String({ maxLength: 40 })),
})

export const UpdateImageBody = t.Object({
  color: t.Optional(t.Nullable(t.String({ maxLength: 40 }))),
  showOnSite: t.Optional(t.Boolean()),
})
export type UpdateImageInput = typeof UpdateImageBody.static

export const ReorderImagesBody = t.Object({ ids: t.Array(t.String({ format: 'uuid' }), { maxItems: 5 }) })
