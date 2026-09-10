export interface ProcessedImage {
  full: Blob
  thumb: Blob
}

async function scaledBlob(src: ImageBitmap, max: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, max / Math.max(src.width, src.height))
  const w = Math.max(1, Math.round(src.width * scale))
  const h = Math.max(1, Math.round(src.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(src, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
      'image/jpeg',
      quality,
    )
  })
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file)
  try {
    const [full, thumb] = await Promise.all([
      scaledBlob(bitmap, 1600, 0.85),
      scaledBlob(bitmap, 480, 0.8),
    ])
    return { full, thumb }
  } finally {
    bitmap.close()
  }
}
