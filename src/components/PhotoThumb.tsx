import type { CSSProperties } from 'react'
import { useLiveQuery, useObjectUrl } from '../lib/hooks'
import { db } from '../db/db'
import { LeafIcon } from './icons'

export function PhotoThumb({
  photoId,
  className = '',
  style,
  onLoad,
}: {
  photoId?: string
  className?: string
  style?: CSSProperties
  onLoad?: () => void
}) {
  const photo = useLiveQuery(
    async () => (photoId ? await db.photos.get(photoId) : undefined),
    [photoId],
  )
  const url = useObjectUrl(photo?.thumb ?? photo?.blob)
  if (url) {
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        className={`bg-stone-200 object-cover ${className}`}
        style={style}
        onLoad={onLoad}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center bg-stone-200 ${className}`}
      style={style}
    >
      <span className="text-stone-400">
        <LeafIcon />
      </span>
    </div>
  )
}
