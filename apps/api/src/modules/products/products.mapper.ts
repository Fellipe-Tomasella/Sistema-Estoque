import { stockStatus } from '@estoque/shared'
import type { Product, Variant } from '../../db/schema'

export function toVariantDto(variant: Variant, product: Pick<Product, 'basePriceCents'>) {
  return {
    id: variant.id,
    productId: variant.productId,
    color: variant.color,
    size: variant.size,
    label: `${variant.color} / ${variant.size}`,
    priceCents: variant.priceCents,
    effectivePriceCents: variant.priceCents ?? product.basePriceCents,
    costCents: variant.costCents,
    sku: variant.sku,
    stockQty: variant.stockQty,
    minStock: variant.minStock,
    stockStatus: stockStatus(variant.stockQty, variant.minStock),
    active: variant.active,
  }
}
export type VariantDto = ReturnType<typeof toVariantDto>

export function toProductDto(product: Product, variants: Variant[]) {
  const variantDtos = variants.map((v) => toVariantDto(v, product))
  return {
    id: product.id,
    name: product.name,
    reference: product.reference,
    category: product.category,
    description: product.description,
    basePriceCents: product.basePriceCents,
    costCents: product.costCents,
    active: product.active,
    totalStock: variantDtos.reduce((sum, v) => sum + v.stockQty, 0),
    variants: variantDtos,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}
export type ProductDto = ReturnType<typeof toProductDto>
