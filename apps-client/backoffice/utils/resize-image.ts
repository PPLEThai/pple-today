const loadImageElement = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    image.src = objectUrl
  })
}

const stripExtension = (fileName: string) => {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName
}

/**
 * Normalize an image file to a square PNG.
 *
 * Loads the given file (raster or SVG), draws it "cover"-fit and centered onto a
 * `size` x `size` transparent canvas, then encodes it as PNG. Returns a new File
 * named `${basename}.png` with type `image/png`.
 */
export const resizeImageToPng = async (file: File, size = 256): Promise<File> => {
  const image = await loadImageElement(file)

  const sourceWidth = image.naturalWidth || image.width || size
  const sourceHeight = image.naturalHeight || image.height || size

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  // Cover fit: scale so the image fills the square, then center-crop the overflow.
  const scale = Math.max(size / sourceWidth, size / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  const dx = (size - drawWidth) / 2
  const dy = (size - drawHeight) / 2

  ctx.drawImage(image, dx, dy, drawWidth, drawHeight)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Failed to encode image')

  return new File([blob], `${stripExtension(file.name)}.png`, { type: 'image/png' })
}
