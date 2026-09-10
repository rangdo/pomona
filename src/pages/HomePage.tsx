import { Link } from 'react-router-dom'
import { useLiveQuery } from '../lib/hooks'
import { db } from '../db/db'
import { relTime } from '../lib/time'
import { PhotoThumb } from '../components/PhotoThumb'
import { ChevronRightIcon, CameraIcon, PlusIcon } from '../components/icons'

export function HomePage() {
  const plants = useLiveQuery(() => db.plants.orderBy('createdAt').toArray(), [])
  const latestObs = useLiveQuery(async () => {
    const obs = await db.observations.orderBy('timestamp').toArray()
    const latest = new Map<string, number>()
    for (const o of obs) latest.set(o.plantId, o.timestamp)
    return latest
  }, [])

  const list = plants ? [...plants].reverse() : undefined

  return (
    <>
      <header className="flex items-center justify-between px-4 pb-3 pt-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Pomona</h1>
          <p className="text-xs text-stone-500">fruit tree journal</p>
        </div>
        <Link
          to="/plants/new"
          className="flex min-h-10 items-center gap-1.5 rounded-full bg-lime-700 px-4 text-sm font-semibold text-white shadow-sm active:bg-lime-800"
        >
          <PlusIcon size={16} /> Plant
        </Link>
      </header>

      {list === undefined && (
        <p className="px-4 py-8 text-center text-sm text-stone-400">Loading…</p>
      )}

      {list && list.length === 0 && (
        <div className="m-4 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-medium">No plants yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Add your first tree to start the journal.
          </p>
          <Link
            to="/plants/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-lime-700 px-6 font-semibold text-white active:bg-lime-800"
          >
            Add your first plant
          </Link>
        </div>
      )}

      {list && list.length > 0 && (
        <ul className="space-y-2 px-3">
          {list.map((p) => {
            const last = latestObs?.get(p.id)
            return (
              <li key={p.id}>
                <Link
                  to={`/plants/${p.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm active:bg-stone-50"
                >
                  <PhotoThumb photoId={p.photoId} className="size-16 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="truncate text-sm text-stone-500">
                      {p.variety || p.species || ' '}
                    </div>
                    <div className="text-xs text-stone-400">
                      {last ? `last observed ${relTime(last)}` : 'no observations yet'}
                    </div>
                  </div>
                  <span className="shrink-0 text-stone-300">
                    <ChevronRightIcon />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {list && list.length > 0 && (
        <Link
          to="/capture"
          className="fixed bottom-6 right-4 z-10 flex min-h-14 items-center gap-2 rounded-full bg-lime-700 px-5 font-semibold text-white shadow-lg active:bg-lime-800"
        >
          <CameraIcon />
          New observation
        </Link>
      )}
    </>
  )
}
