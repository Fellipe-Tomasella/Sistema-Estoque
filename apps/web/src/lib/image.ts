// Fotos tiradas no celular têm 4 a 12 MB: subir isso pela internet móvel demorava minutos e parecia travado.
// Antes de enviar, a foto é reduzida no próprio aparelho (o servidor guarda no máximo 1600 px de qualquer jeito).

const MAX_SIDE = 2000
const QUALITY = 0.85

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // respeita a rotação da câmera (EXIF)
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // navegadores antigos: carrega por <img>
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

/** Foto reduzida (lado maior até 2000 px) em JPEG. Se o aparelho não conseguir abrir o formato, lança erro. */
export async function shrinkImage(file: File): Promise<File> {
  let source: ImageBitmap | HTMLImageElement
  try {
    source = await decode(file)
  } catch {
    throw new Error(`Não consegui abrir “${file.name}”. Use uma foto JPG, PNG ou WebP.`)
  }
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  // já pequena e num formato aceito: envia como está
  if (scale === 1 && file.size < 1.5 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type)) return file

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  if ('close' in source) source.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  if (!blob) throw new Error(`Não consegui preparar “${file.name}”. Tente outra foto.`)
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
}
