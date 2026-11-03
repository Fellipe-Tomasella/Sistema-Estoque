import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { env } from '../config/env'
import { ValidationError } from './errors'

export type ImageSize = 'thumb' | 'large'

/** Lado maior de cada tamanho gerado (o original não é guardado). */
const SIZES: Record<ImageSize, number> = { thumb: 400, large: 1600 }
/** Nome dos arquivos servidos em `/api/media/:name`. */
export const MEDIA_FILE = /^[0-9a-f-]{36}-(thumb|large)\.webp$/

export const mediaUrl = (id: string, size: ImageSize) => `/api/media/${id}-${size}.webp`

export interface ProcessedImage {
  width: number
  height: number
  files: Record<ImageSize, Buffer>
}

/** Converte a foto enviada em WebP (miniatura e tamanho grande) e grava em MEDIA_DIR. */
export class MediaStorage {
  constructor(private readonly dir = env.mediaDir) {}

  async process(file: Blob): Promise<ProcessedImage> {
    const input = Buffer.from(await file.arrayBuffer())
    try {
      // rotate() aplica a orientação da câmera (EXIF); os metadados não vão para o arquivo final
      const image = sharp(input, { failOn: 'error' }).rotate()
      const files = {} as Record<ImageSize, Buffer>
      let width = 0
      let height = 0
      for (const size of Object.keys(SIZES) as ImageSize[]) {
        const out = await image
          .clone()
          .resize(SIZES[size], SIZES[size], { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer({ resolveWithObject: true })
        files[size] = out.data
        if (size === 'large') ({ width, height } = out.info)
      }
      return { width, height, files }
    } catch {
      throw new ValidationError('Arquivo não reconhecido como foto. Envie JPG, PNG ou WebP.')
    }
  }

  async save(id: string, image: ProcessedImage) {
    await mkdir(this.dir, { recursive: true })
    for (const [size, data] of Object.entries(image.files)) await Bun.write(this.path(id, size as ImageSize), data)
  }

  async remove(id: string) {
    for (const size of Object.keys(SIZES) as ImageSize[]) await rm(this.path(id, size), { force: true })
  }

  /** Arquivo de `/api/media/:name`, ou null se o nome não é válido. */
  file(name: string) {
    return MEDIA_FILE.test(name) ? Bun.file(join(this.dir, name)) : null
  }

  private path(id: string, size: ImageSize) {
    return join(this.dir, `${id}-${size}.webp`)
  }
}
