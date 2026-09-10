import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from '../lib/hooks'
import { db, type Observation } from '../db/db'
import { formatDate, formatTime, monthKey, monthLabel } from '../lib/time'
import { Header } from '../components/Header'
import { PhotoThumb } from '../components/PhotoThumb'
import { ChipLabel } from '../components/Chips'
import { CameraIcon, PencilIcon, TrashIcon } from '../components/icons'

function fmtWeight(g: number): string {
  return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`
}

export function PlantDetailPage() {
  const { id = '' } = useParams()

  const plant = useLiveQuery(() => db.plants.get(id), [id])
  const observations = useLiveQuery(
    () => db.observations.where('plantId').equals(id).sortBy('timestamp'),
    [id],
  )
  const sorted: Observation[] | undefined = observations
    ? [...observations].reverse()
    : undefined

  const groups = useMemo(() => {
    if (!sorted) return undefined
    const byMonth = new Map<string, Observation[]>()
    for (const o of sorted) {
      const key = monthKey(o.timestamp)
      const list = byMonth.get(key) ?? []
      list.push(o)
      byMonth.set(key, list)
    }
    return [...byMonth.entries()]
  }, [sorted])

  async function deleteObs(obsId: string, photoId?: string) {
    if (!confirm('Delete this observation?')) return
    try {
      await db.transaction('rw', db.photos, db.observations, async () => {
        if (photoId) await db.photos.delete(photoId)
        await db.observations.delete(obsId)
      })
    } catch (err) {
      console.error(err)
      alert('Delete failed — please try again.')
    }
  }

  if (!plant) {
    return (
      <>
        <Header title="Plant" backTo="/" />
        {sorted !== undefined && (
          <p className="px-4 py-8 text-center text-sm text-stone-400">Plant not found.</p>
        )}
      </>
    )
  }

  const subtitleBits = [plant.variety, plant.species, plant.location].filter(Boolean)
  const plantedLine = plant.plantedDate
    ? `planted ${new Date(plant.plantedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : undefined

  return (
    <>
      <Header
        title={plant.name}
        subtitle={subtitleBits.length > 0 ? subtitleBits.join(' · ') : undefined}
        backTo="/"
        right={
          <Link
            to={`/plants/${id}/edit`}
            aria-label="Edit plant"
            className="flex size-10 items-center justify-center rounded-full text-stone-500 active:bg-stone-200"
          >
            <PencilIcon />
          </Link>
        }
      />

      {plantedLine && (
        <p className="px-4 pt-3 text-xs text-stone-400">{plantedLine}</p>
      )}

      {groups && groups.length === 0 && (
        <div className="m-4 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-medium">No observations yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Photograph this tree through the year to build its story.
          </p>
        </div>
      )}

      {groups?.map(([key, list]) => (
        <section key={key} className="px-3 pt-4">
          <h2 className="px-1 pb-2 text-sm font-bold text-stone-700">
            {monthLabel(key)}
            <span className="ml-2 text-xs font-normal text-stone-400">
              {list.length} {list.length === 1 ? 'entry' : 'entries'}
            </span>
          </h2>
          <ul className="space-y-2">
            {list.map((o) => (
              <li
                key={o.id}
                className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm"
              >
                {o.photoId ? (
                  <PhotoThumb photoId={o.photoId} className="size-24 shrink-0 rounded-xl" />
                ) : (
                  <div className="size-24 shrink-0 rounded-xl bg-stone-100" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {formatDate(o.timestamp)}, {formatTime(o.timestamp)}
                    </span>
                    <button
                      type="button"
                      aria-label="Delete observation"
                      onClick={() => void deleteObs(o.id, o.photoId)}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-stone-300 active:bg-stone-100 active:text-rose-600"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  {(o.parts.length > 0 || o.conditions.length > 0 || o.treatments.length > 0) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {o.parts.map((l) => (
                        <ChipLabel key={`p-${l}`} category="part" label={l} />
                      ))}
                      {o.conditions.map((l) => (
                        <ChipLabel key={`c-${l}`} category="condition" label={l} />
                      ))}
                      {o.treatments.map((l) => (
                        <ChipLabel key={`t-${l}`} category="treatment" label={l} />
                      ))}
                    </div>
                  )}
                  {(o.fruitCount !== undefined || o.weightG !== undefined) && (
                    <div className="mt-1 text-sm font-medium text-lime-800">
                      {[
                        o.fruitCount !== undefined ? `${o.fruitCount} fruit` : null,
                        o.weightG !== undefined ? fmtWeight(o.weightG) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                  {o.note && <p className="mt-1 text-sm text-stone-600">{o.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Link
        to={`/capture/${id}`}
        className="fixed bottom-6 right-4 z-10 flex min-h-14 items-center gap-2 rounded-full bg-lime-700 px-5 font-semibold text-white shadow-lg active:bg-lime-800"
      >
        <CameraIcon />
        New observation
      </Link>

      {sorted && sorted.length > 0 && (
        <p className="px-4 py-4 text-center text-xs text-stone-400">
          {sorted.length} observation{sorted.length === 1 ? '' : 's'} · newest first
        </p>
      )}

    </>
  )
}
