export interface ProcessedImage {
  full: Blob
  thumb: Blob
}

export function isPdf(file: File): boolean {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  )
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

async function pdfFirstPageBitmap(file: File): Promise<ImageBitmap> {
  const blob = await renderPdfFirstPage(file, 1600)
  return createImageBitmap(blob)
}

export async function renderPdfFirstPage(source: Blob, targetWidth: number): Promise<Blob> {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const data = await source.arrayBuffer()
  const task = pdfjs.getDocument({ data })
  const doc = await task.promise
  try {
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(12, Math.max(0.1, targetWidth / base.width))
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(viewport.width))
    canvas.height = Math.max(1, Math.round(viewport.height))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, viewport }).promise
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('PDF render failed'))),
        'image/jpeg',
        0.9,
      )
    })
  } finally {
    await task.destroy()
  }
}

export async function processLocationImage(file: File): Promise<ProcessedImage> {
  if (!isPdf(file)) return processImage(file)
  const bitmap = await pdfFirstPageBitmap(file)
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
