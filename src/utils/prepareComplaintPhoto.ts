import { validatePhoto } from '../services/storageService'

export const MAX_PHOTOS_PER_BATCH = 5
const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const MAX_EDGE = 2048

/** Resize locally before upload; keep the original when it is already smaller. */
export async function prepareComplaintPhoto(source: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(source.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP photo.')
  }
  if (source.size > MAX_SOURCE_BYTES) throw new Error('Choose a photo smaller than 20 MB.')
  if (!source.size) throw new Error('This photo is empty. Choose another file.')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(source)
  } catch {
    throw new Error('This photo could not be opened. Choose another JPEG, PNG, or WebP image.')
  }
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('We could not prepare this photo. Try a smaller image.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const mimeType = source.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp'
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('We could not compress this photo. Try a smaller image.')), mimeType, 0.82)
    })
    if (scale === 1 && source.size <= blob.size) {
      validatePhoto(source)
      return source
    }
    const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png'
    const name = `${source.name.replace(/\.[^.]+$/, '') || 'photo'}.${extension}`
    const prepared = new File([blob], name, { type: blob.type, lastModified: source.lastModified })
    validatePhoto(prepared)
    return prepared
  } finally {
    bitmap.close()
  }
}
