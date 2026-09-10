import { useLiveQuery, useObjectUrl } from '../lib/hooks'
import { db } from '../db/db'
import { LeafIcon } from './icons'

export function PhotoThumb({ photoId, className = '' }: { photoId?: string; className?: string }) {
  const photo = useLiveQuery(
    async () => (photoId ? await db.photos.get(photoId) : undefined),
    [photoId],
  )
  const url = useObjectUrl(photo?.thumb ?? photo?.blob)
  if (url) {
    return <img src={url} alt="" className={`bg-stone-200 object-cover ${className}`} />
  }
  return (
    <div className={`flex items-center justify-center bg-stone-200 ${className}`}>
      <span className="text-stone-400">
        <LeafIcon />
      </span>
    </div>
  )
}
