import exifr from 'exifr'

export interface PhotoMeta {
  takenAt: number
  gps?: { lat: number; lon: number }
}

export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  let takenAt = file.lastModified || Date.now()
  let gps: PhotoMeta['gps']
  try {
    const meta = await exifr.parse(file, { tiff: true, gps: true })
    if (meta) {
      const d: unknown = meta.DateTimeOriginal ?? meta.CreateDate
      if (d instanceof Date && !Number.isNaN(d.getTime())) takenAt = d.getTime()
      else if (typeof d === 'number') takenAt = d
      if (typeof meta.latitude === 'number' && typeof meta.longitude === 'number') {
        gps = {
          lat: Number(meta.latitude.toFixed(5)),
          lon: Number(meta.longitude.toFixed(5)),
        }
      }
    }
  } catch {
    // file has no readable EXIF; fall back to lastModified
  }
  return { takenAt, gps }
}
