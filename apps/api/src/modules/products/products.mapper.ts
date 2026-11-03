import { stockStatus } from '@estoque/shared'
import type { Product, ProductImage, Variant } from '../../db/schema'
import { mediaUrl } from '../../shared/media-storage'

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
    barcode: variant.barcode,
    stockQty: variant.stockQty,
    minStock: variant.minStock,
    stockStatus: stockStatus(variant.stockQty, variant.minStock),
    active: variant.active,
  }
}
export type VariantDto = ReturnType<typeof toVariantDto>

export function toImageDto(image: ProductImage) {
  return {
    id: image.id,
    color: image.color,
    showOnSite: image.showOnSite,
    width: image.width,
    height: image.height,
    thumbUrl: mediaUrl(image.id, 'thumb'),
    largeUrl: mediaUrl(image.id, 'large'),
  }
}
export type ProductImageDto = ReturnType<typeof toImageDto>

/** Miniatura que representa o produto (ou a cor): a primeira foto da cor; sem ela, a capa. */
export function coverUrl(images: ProductImage[], color?: string) {
  const match = color ? images.find((i) => i.color?.toLowerCase() === color.toLowerCase()) : undefined
  const image = match ?? images[0]
  return image ? mediaUrl(image.id, 'thumb') : null
}

export function toProductDto(product: Product, variants: Variant[], images: ProductImage[] = []) {
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
    site: {
      visible: product.showOnSite,
      priceCents: product.sitePriceCents,
      hidePrice: product.hideSitePrice,
      compareAtCents: product.siteCompareAtCents,
      unlisted: product.siteUnlisted,
      description: product.siteDescription,
    },
    totalStock: variantDtos.reduce((sum, v) => sum + v.stockQty, 0),
    variants: variantDtos,
    coverUrl: coverUrl(images),
    images: images.map(toImageDto),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}
export type ProductDto = ReturnType<typeof toProductDto>
