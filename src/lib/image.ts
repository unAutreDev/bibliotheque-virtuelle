const MAX_SIDE = 900
const QUALITY = 0.82

/**
 * Décode la photo avec un élément <img> : tous les navigateurs récents y appliquent
 * l'orientation EXIF de l'appareil photo, et drawImage la conserve. createImageBitmap,
 * lui, l'ignore ou l'applique deux fois selon les versions de Safari (photo tournée).
 */
async function decode(url: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.src = url
  await img.decode()
  return img
}

/**
 * Transforme une photo (souvent plusieurs Mo) en JPEG réduit, encodé en data URL,
 * pour la stocker avec la lecture sur l'appareil et l'afficher hors ligne.
 */
export async function photoToCover(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    return draw(await decode(url))
  } finally {
    URL.revokeObjectURL(url)
  }
}

function draw(image: HTMLImageElement): string {
  const [width, height] = [image.naturalWidth, image.naturalHeight]
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas indisponible')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', QUALITY)
}

export const isPhoto = (url?: string) => url?.startsWith('data:image/') ?? false
