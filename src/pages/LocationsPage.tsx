import { Link } from 'react-router-dom'
import { useLiveQuery } from '../lib/hooks'
import { db } from '../db/db'
import { AREA_COLORS } from '../lib/palette'
import { plantLabel } from '../lib/plantMeta'
import { PhotoThumb } from '../components/PhotoThumb'
import { ChevronRightIcon, PlusIcon } from '../components/icons'
import { Header } from '../components/Header'

export function LocationsPage() {
  const locations = useLiveQuery(() => db.locations.toArray(), [])
  const plants = useLiveQuery(async () => {
    const all = await db.plants.toArray()
    return all.sort((a, b) => plantLabel(a).localeCompare(plantLabel(b)))
  }, [])

  const list = locations ? [...locations].sort((a, b) => a.name.localeCompare(b.name)) : undefined
  const unassigned = (plants ?? []).filter((p) => !p.locationId)
  const plantsOf = (locationId: string) =>
    (plants ?? []).filter((p) => p.locationId === locationId).length

  return (
    <>
      <Header
        title="Locations"
        subtitle="areas of your garden"
        backTo="/"
        right={
          <Link
            to="/locations/new"
            className="flex min-h-10 items-center gap-1.5 rounded-full bg-lime-700 px-4 text-sm font-semibold text-white shadow-sm active:bg-lime-800"
          >
            <PlusIcon size={16} /> Add
          </Link>
        }
      />

      {list === undefined && (
        <p className="px-4 py-8 text-center text-sm text-stone-400">Loading…</p>
      )}

      {list && list.length === 0 && (
        <div className="m-4 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-medium">No locations yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Name the areas of your garden — back garden, allotment, greenhouse —
            then drop your plants into them.
          </p>
          <Link
            to="/locations/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-lime-700 px-6 font-semibold text-white active:bg-lime-800"
          >
            Create your first location
          </Link>
        </div>
      )}

      {list && list.length > 0 && (
        <ul className="space-y-2 px-3">
          {list.map((loc) => (
            <li key={loc.id}>
              <Link
                to={`/locations/${loc.id}`}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm active:bg-stone-50"
              >
                {loc.imagePhotoId ? (
                  <PhotoThumb
                    photoId={loc.imagePhotoId}
                    className="size-16 shrink-0 rounded-xl"
                  />
                ) : (
                  <div
                    className={`flex size-16 shrink-0 items-center justify-center rounded-xl border-2 ${
                      AREA_COLORS[loc.color % AREA_COLORS.length]
                    }`}
                  >
                    <span className="text-xl font-bold">
                      {loc.name.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{loc.name}</div>
                  <div className="text-xs text-stone-400">
                    {plantsOf(loc.id)} {plantsOf(loc.id) === 1 ? 'plant' : 'plants'}
                  </div>
                </div>
                <span className="shrink-0 text-stone-300">
                  <ChevronRightIcon />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {unassigned.length > 0 && (
        <section className="mt-4 px-3">
          <h2 className="mb-1 px-1 text-sm font-semibold text-stone-500">
            No location yet
          </h2>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <Link
                key={p.id}
                to={`/plants/${p.id}`}
                className="flex max-w-full items-center gap-1.5 rounded-full border border-stone-300 bg-white py-0.5 pl-0.5 pr-3 text-xs font-medium shadow-sm active:bg-stone-100"
              >
                <PhotoThumb photoId={p.photoId} className="size-5 rounded-full" />
                <span className="truncate">{plantLabel(p)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
