import { db, type DbOrTx } from '../../db/client'
import { BusinessRuleError, NotFoundError, ValidationError } from '../../shared/errors'
import type { MediaStorage } from '../../shared/media-storage'
import type { AuditService } from '../audit/audit.service'
import { toImageDto } from './products.mapper'
import type { ImageChanges, ProductsRepository } from './products.repository'
import type { UpdateImageInput } from './products.schemas'

/** RN-PRO-12: até 5 fotos por produto. */
export const MAX_IMAGES = 5

/** Fotos dos produtos (RN-PRO-12 a 14): servem ao catálogo interno, ao PDV e ao site. */
export class ProductImagesService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly media: MediaStorage,
    private readonly audit: AuditService,
  ) {}

  async list(productId: string) {
    await this.requireProduct(productId)
    return this.listWithin(productId)
  }

  /** Converte a foto antes de abrir a transação; grava os arquivos e, se o registro falhar, apaga-os. */
  async add(productId: string, file: Blob, color: string | null | undefined, userId: string) {
    const processed = await this.media.process(file)
    const id = Bun.randomUUIDv7()
    await this.media.save(id, processed)
    try {
      return await db.transaction(async (tx) => {
        await this.requireProduct(productId, tx, true)
        const images = await this.repo.findImages([productId], tx)
        if (images.length >= MAX_IMAGES) {
          throw new BusinessRuleError(`O produto já tem ${MAX_IMAGES} fotos. Exclua uma para enviar outra.`)
        }
        await this.repo.insertImage(
          {
            id,
            productId,
            color: await this.colorOf(productId, color, tx),
            position: images.length,
            width: processed.width,
            height: processed.height,
          },
          tx,
        )
        await this.audit.record({ entity: 'product_image', entityId: id, action: 'create', userId }, tx)
        return this.listWithin(productId, tx)
      })
    } catch (error) {
      await this.media.remove(id)
      throw error
    }
  }

  async update(productId: string, imageId: string, input: UpdateImageInput) {
    return db.transaction(async (tx) => {
      await this.requireProduct(productId, tx, true)
      await this.requireImage(productId, imageId, tx)
      const changes: ImageChanges = {}
      if ('color' in input) changes.color = await this.colorOf(productId, input.color, tx)
      if (input.showOnSite !== undefined) changes.showOnSite = input.showOnSite
      await this.repo.updateImage(imageId, changes, tx)
      return this.listWithin(productId, tx)
    })
  }

  /** RN-PRO-13: a ordem enviada precisa ter exatamente as fotos do produto; a primeira vira a capa. */
  async reorder(productId: string, ids: string[]) {
    return db.transaction(async (tx) => {
      await this.requireProduct(productId, tx, true)
      const current = await this.repo.findImages([productId], tx)
      const same =
        ids.length === current.length && new Set(ids).size === ids.length && current.every((i) => ids.includes(i.id))
      if (!same) throw new ValidationError('A lista de fotos mudou. Recarregue a tela e tente de novo.')
      for (const [position, id] of ids.entries()) await this.repo.updateImage(id, { position }, tx)
      return this.listWithin(productId, tx)
    })
  }

  async remove(productId: string, imageId: string, userId: string) {
    const images = await db.transaction(async (tx) => {
      await this.requireProduct(productId, tx, true)
      await this.requireImage(productId, imageId, tx)
      await this.repo.deleteImage(imageId, tx)
      const rest = await this.repo.findImages([productId], tx)
      for (const [position, image] of rest.entries()) {
        if (image.position !== position) await this.repo.updateImage(image.id, { position }, tx)
      }
      await this.audit.record({ entity: 'product_image', entityId: imageId, action: 'delete', userId }, tx)
      return this.listWithin(productId, tx)
    })
    // arquivos só depois do commit: se a transação falhar, a foto continua
    await this.media.remove(imageId)
    return images
  }

  private async listWithin(productId: string, tx: DbOrTx = db) {
    return (await this.repo.findImages([productId], tx)).map(toImageDto)
  }

  /** RN-PRO-14: a foto é de uma cor do produto (grafada como na variação) ou do produto em geral (null). */
  private async colorOf(productId: string, color: string | null | undefined, tx: DbOrTx) {
    const wanted = color?.trim().toLowerCase()
    if (!wanted) return null
    const variant = (await this.repo.findVariants(productId, tx)).find((v) => v.color.toLowerCase() === wanted)
    if (!variant) throw new ValidationError('Essa cor não existe neste produto.')
    return variant.color
  }

  private async requireProduct(id: string, tx: DbOrTx = db, lock = false) {
    const product = await this.repo.findProduct(id, tx, lock)
    if (!product) throw new NotFoundError('Produto não encontrado.')
    return product
  }

  private async requireImage(productId: string, imageId: string, tx: DbOrTx) {
    const image = (await this.repo.findImages([productId], tx)).find((i) => i.id === imageId)
    if (!image) throw new NotFoundError('Foto não encontrada.')
    return image
  }
}
