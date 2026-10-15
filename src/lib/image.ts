const MAX_SIDE = 900
const QUALITY = 0.82

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Anciens navigateurs : passage par un élément <img>.
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

/**
 * Transforme une photo (souvent plusieurs Mo) en JPEG réduit, encodé en data URL,
 * pour la stocker avec la lecture sur l'appareil et l'afficher hors ligne.
 */
export async function photoToCover(file: File): Promise<string> {
  const image = await decode(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas indisponible')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  if ('close' in image && typeof image.close === 'function') image.close()
  return canvas.toDataURL('image/jpeg', QUALITY)
}

export const isPhoto = (url?: string) => url?.startsWith('data:image/') ?? false
