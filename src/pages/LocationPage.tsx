import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from '../lib/hooks'
import { db, type Plant } from '../db/db'
import { clampPin, isPlaced } from '../lib/pins'
import { plantLabel } from '../lib/plantMeta'
import { Header } from '../components/Header'
import { PhotoThumb } from '../components/PhotoThumb'
import { sectionClass } from '../components/styles'
import { PencilIcon, PlusIcon } from '../components/icons'

interface PinDrag {
  plantId: string
  startClientX: number
  startClientY: number
  origX: number
  origY: number
  rect: DOMRect
  cur: { x: number; y: number }
  moved: boolean
}

function frac(deltaPx: number, sizePx: number, orig: number): number {
  return clampPin(orig + deltaPx / sizePx)
}

export function LocationPage() {
  const { id = '' } = useParams()
  const location = useLiveQuery(() => db.locations.get(id), [id])
  const plants = useLiveQuery(async () => {
    const all = await db.plants.toArray()
    return all.sort((a, b) => plantLabel(a).localeCompare(plantLabel(b)))
  }, [])

  const [arrange, setArrange] = useState(false)
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Record<string, { x: number; y: number }>>({})
  const [dragPlantId, setDragPlantId] = useState<string | null>(null)
  const [overImage, setOverImage] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const pinDrag = useRef<PinDrag | null>(null)
  const trayDrag = useRef<{ plantId: string } | null>(null)

  const locationPlants = (plants ?? []).filter((p) => p.locationId === id)
  const unpinned = locationPlants.filter((p) => !isPlaced(p))
  const pinned = locationPlants.filter(isPlaced)
  const imagePhotoId = location?.imagePhotoId

  function posOf(plant: Plant) {
    const pv = preview[plant.id]
    return pv ?? { x: plant.pinX as number, y: plant.pinY as number }
  }

  function onPinPointerDown(e: React.PointerEvent<HTMLElement>, plant: Plant) {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    pinDrag.current = {
      plantId: plant.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: plant.pinX as number,
      origY: plant.pinY as number,
      rect,
      cur: { x: plant.pinX as number, y: plant.pinY as number },
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPinPointerMove(e: React.PointerEvent<HTMLElement>, plant: Plant) {
    const d = pinDrag.current
    if (!d || d.plantId !== plant.id) return
    const dx = e.clientX - d.startClientX
    const dy = e.clientY - d.startClientY
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true
    if (!d.moved) return
    d.cur = { x: frac(dx, d.rect.width, d.origX), y: frac(dy, d.rect.height, d.origY) }
    setPreview((prev) => ({ ...prev, [plant.id]: d.cur }))
  }

  async function onPinPointerUp(_e: React.PointerEvent<HTMLElement>, plant: Plant) {
    const d = pinDrag.current
    pinDrag.current = null
    const cur = d && d.plantId === plant.id && d.moved ? d.cur : undefined
    setPreview((prev) => {
      const next = { ...prev }
      delete next[plant.id]
      return next
    })
    if (cur) {
      if (cur.x !== plant.pinX || cur.y !== plant.pinY) {
        try {
          await db.plants.update(plant.id, { pinX: cur.x, pinY: cur.y })
        } catch (err) {
          console.error(err)
          alert('Could not save the pin position.')
        }
      }
    } else {
      setSelectedPinId((prev) => (prev === plant.id ? null : plant.id))
    }
  }

  function onTrayPointerDown(e: React.PointerEvent<HTMLElement>, plant: Plant) {
    trayDrag.current = { plantId: plant.id }
    setDragPlantId(plant.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onTrayPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!trayDrag.current) return
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setOverImage(
      e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom,
    )
  }

  async function onTrayPointerUp(e: React.PointerEvent<HTMLElement>) {
    const d = trayDrag.current
    trayDrag.current = null
    setDragPlantId(null)
    const rect = wrapRef.current?.getBoundingClientRect()
    setOverImage(false)
    if (!d || !rect) return
    const x = clampPin((e.clientX - rect.left) / rect.width)
    const y = clampPin((e.clientY - rect.top) / rect.height)
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return
    try {
      await db.plants.update(d.plantId, { pinX: x, pinY: y })
      setSelectedPinId(null)
    } catch (err) {
      console.error(err)
      alert('Could not place the pin.')
    }
  }

  async function removePin() {
    if (!selectedPinId) return
    try {
      await db.plants.update(selectedPinId, { pinX: undefined, pinY: undefined })
      setSelectedPinId(null)
    } catch (err) {
      console.error(err)
      alert('Could not remove the pin.')
    }
  }

  if (!location) {
    return (
      <>
        <Header title="Location" backTo="/locations" />
        {plants !== undefined && (
          <p className="px-4 py-8 text-center text-sm text-stone-400">Location not found.</p>
        )}
      </>
    )
  }

  const arrangeBtn = arrange
    ? 'min-h-9 rounded-full bg-lime-700 px-3.5 text-sm font-semibold text-white active:bg-lime-800'
    : 'min-h-9 rounded-full border border-stone-300 bg-white px-3.5 text-sm font-semibold text-stone-700 active:bg-stone-200'

  return (
    <>
      <Header
        title={location.name}
        subtitle={arrange ? 'drag pins into place' : `${locationPlants.length} plants`}
        backTo="/locations"
        right={
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setArrange((a) => !a)} className={arrangeBtn}>
              {arrange ? 'Done' : 'Arrange'}
            </button>
            {!arrange && (
              <Link
                to={`/locations/${id}/edit`}
                aria-label="Edit location"
                className="flex size-10 items-center justify-center rounded-full text-stone-500 active:bg-stone-200"
              >
                <PencilIcon />
              </Link>
            )}
          </div>
        }
      />

      <div className="p-3">
        {imagePhotoId ? (
          <div
            ref={wrapRef}
            data-testid="location-image"
            className={`relative overflow-hidden rounded-2xl border-2 border-stone-200 ${
              overImage ? 'ring-4 ring-lime-600' : ''
            }`}
          >
            <PhotoThumb photoId={imagePhotoId} className="block w-full" />
            {pinned.map((p) => {
              const pos = posOf(p)
              const inner = (
                <>
                  <PhotoThumb
                    photoId={p.photoId}
                    className="rounded-full"
                    style={{ width: 40, height: 40 }}
                  />
                  <span
                    className="max-w-28 truncate rounded-full bg-stone-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                    style={arrange ? undefined : { pointerEvents: 'none' }}
                  >
                    {plantLabel(p)}
                  </span>
                </>
              )
              const cls = `absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 ${
                arrange ? 'cursor-grab active:cursor-grabbing' : ''
              } ${selectedPinId === p.id ? 'rounded-full ring-4 ring-lime-600' : ''}`
              const style = {
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                touchAction: arrange ? ('none' as const) : ('auto' as const),
                zIndex: preview[p.id] ? 10 : undefined,
              }
              if (arrange) {
                return (
                  <span
                    key={p.id}
                    aria-label={`Pin ${plantLabel(p)}`}
                    className={cls}
                    style={style}
                    onPointerDown={(e) => onPinPointerDown(e, p)}
                    onPointerMove={(e) => onPinPointerMove(e, p)}
                    onPointerUp={(e) => void onPinPointerUp(e, p)}
                    onPointerCancel={(e) => void onPinPointerUp(e, p)}
                  >
                    {inner}
                  </span>
                )
              }
              return (
                <Link
                  key={p.id}
                  to={`/plants/${p.id}`}
                  aria-label={`Pin ${plantLabel(p)}`}
                  className={cls}
                  style={style}
                >
                  {inner}
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
            <p className="font-medium">No image yet</p>
            <p className="mt-1 text-sm text-stone-500">
              Add one to place plants with pins on the map.
            </p>
            <Link
              to={`/locations/${id}/edit`}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-lime-700 px-6 font-semibold text-white active:bg-lime-800"
            >
              <PlusIcon size={16} /> Add image
            </Link>
          </div>
        )}

        {arrange && imagePhotoId && (
          <>
            {selectedPinId && (
              <div className={`${sectionClass} mt-3 flex items-center justify-between`}>
                <span className="text-sm text-stone-600">Pin selected</span>
                <button
                  type="button"
                  onClick={() => void removePin()}
                  className="min-h-10 rounded-full border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-600 active:bg-rose-50"
                >
                  Remove pin
                </button>
              </div>
            )}
            <section className="mt-3">
              <h2 className="mb-1 text-sm font-semibold text-stone-500">Not pinned yet</h2>
              {unpinned.length === 0 ? (
                <p className="text-xs text-stone-400">
                  Every plant here has a pin — or assign plants from their edit page.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {unpinned.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onPointerDown={(e) => onTrayPointerDown(e, p)}
                      onPointerMove={onTrayPointerMove}
                      onPointerUp={(e) => void onTrayPointerUp(e)}
                      onPointerCancel={(e) => void onTrayPointerUp(e)}
                      className={`flex max-w-full items-center gap-1.5 rounded-full border border-stone-300 bg-white py-0.5 pl-0.5 pr-3 text-xs font-medium shadow-sm cursor-grab active:cursor-grabbing ${
                        dragPlantId === p.id ? 'opacity-50' : ''
                      }`}
                      style={{ touchAction: 'none' }}
                    >
                      <PhotoThumb photoId={p.photoId} className="size-5 rounded-full" />
                      <span className="truncate">{plantLabel(p)}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-stone-400">
                Drag a plant onto the image to pin it. Drag pins to move them. Tap a
                pin to select it.
              </p>
            </section>
          </>
        )}

        {locationPlants.length > 0 && !arrange && (
          <section className="mt-3">
            <h2 className="mb-1 text-sm font-semibold text-stone-500">
              Plants here
            </h2>
            <div className="flex flex-wrap gap-2">
              {locationPlants.map((p) => (
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
      </div>
    </>
  )
}
