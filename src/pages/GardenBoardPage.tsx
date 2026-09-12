import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from '../lib/hooks'
import { db, type Bed, type Plant } from '../db/db'
import { BED_COLORS, BOARD_H, BOARD_W, CELL, clampPos, snap } from '../lib/board'
import { Header } from '../components/Header'
import { PhotoThumb } from '../components/PhotoThumb'
import { sectionClass } from '../components/styles'
import { PencilIcon, PlusIcon, XIcon } from '../components/icons'

interface BedDrag {
  id: string
  startClientX: number
  startClientY: number
  origX: number
  origY: number
}

function PlantChip({
  plant,
  link,
  scale,
}: {
  plant: Plant
  link: boolean
  scale: number
}) {
  const fontSize = Math.max(9, Math.round(12 * scale))
  const thumb = Math.max(10, Math.round(18 * scale))
  const padY = Math.max(1, Math.round(3 * scale))
  const padX = Math.max(2, Math.round(6 * scale))
  const cls =
    'flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-white/85 font-medium shadow-sm'
  const style = {
    fontSize,
    paddingTop: padY,
    paddingBottom: padY,
    paddingLeft: padX,
    paddingRight: padX,
  }
  if (link) {
    return (
      <Link
        to={`/plants/${plant.id}`}
        className={cls}
        style={style}
      >
        {inner(plant, thumb)}
      </Link>
    )
  }
  return (
    <span className={`${cls} cursor-grab active:cursor-grabbing`} style={style}>
      {inner(plant, thumb)}
    </span>
  )
}

function inner(plant: Plant, thumb: number) {
  return (
    <>
      <PhotoThumb
        photoId={plant.photoId}
        className="shrink-0 rounded-full"
        style={{ width: thumb, height: thumb }}
      />
      <span className="truncate">{plant.name}</span>
    </>
  )
}

export function GardenBoardPage() {
  const beds = useLiveQuery(() => db.beds.toArray(), [])
  const plants = useLiveQuery(() => db.plants.orderBy('name').toArray(), [])

  const [arrange, setArrange] = useState(false)
  const [pickerBedId, setPickerBedId] = useState<string | null>(null)
  const [scale, setScale] = useState(0)
  const [preview, setPreview] = useState<Record<string, { x: number; y: number }>>({})
  const [dragPlantId, setDragPlantId] = useState<string | null>(null)
  const [hoverBedId, setHoverBedId] = useState<string | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const bedDrag = useRef<BedDrag | null>(null)
  const trayDrag = useRef<{ plantId: string } | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / BOARD_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const s = scale || 0.4

  const bedList = beds ?? []
  const plantList = plants ?? []
  const unassigned = plantList.filter((p) => !p.bedId)
  const plantsOf = (bedId: string) => plantList.filter((p) => p.bedId === bedId)
  const pickerBed = pickerBedId ? bedList.find((b) => b.id === pickerBedId) : undefined

  function posOf(bed: Bed) {
    return preview[bed.id] ?? { x: bed.x, y: bed.y }
  }

  function onBedPointerDown(e: React.PointerEvent<HTMLElement>, bed: Bed) {
    bedDrag.current = {
      id: bed.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: bed.x,
      origY: bed.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onBedPointerMove(e: React.PointerEvent<HTMLElement>, bed: Bed) {
    const d = bedDrag.current
    if (!d || d.id !== bed.id) return
    const dx = (e.clientX - d.startClientX) / s
    const dy = (e.clientY - d.startClientY) / s
    const p = clampPos(snap(d.origX + dx), snap(d.origY + dy), bed.w, bed.h)
    setPreview((prev) => ({ ...prev, [bed.id]: p }))
  }

  async function onBedPointerUp(_e: React.PointerEvent<HTMLElement>, bed: Bed) {
    bedDrag.current = null
    const p = preview[bed.id]
    setPreview((prev) => {
      const next = { ...prev }
      delete next[bed.id]
      return next
    })
    if (p && (p.x !== bed.x || p.y !== bed.y)) {
      try {
        await db.beds.put({ ...bed, x: p.x, y: p.y })
      } catch (err) {
        console.error(err)
        alert('Could not save the new position.')
      }
    }
  }

  function bedAt(clientX: number, clientY: number): Bed | undefined {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return undefined
    const bx = (clientX - rect.left) / s
    const by = (clientY - rect.top) / s
    return bedList.find(
      (b) => bx >= b.x && bx < b.x + b.w && by >= b.y && by < b.y + b.h,
    )
  }

  function onTrayPointerDown(e: React.PointerEvent<HTMLElement>, plant: Plant) {
    trayDrag.current = { plantId: plant.id }
    setDragPlantId(plant.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onTrayPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!trayDrag.current) return
    setHoverBedId(bedAt(e.clientX, e.clientY)?.id ?? null)
  }

  async function onTrayPointerUp(e: React.PointerEvent<HTMLElement>) {
    const d = trayDrag.current
    trayDrag.current = null
    setDragPlantId(null)
    const target = bedAt(e.clientX, e.clientY)
    setHoverBedId(null)
    if (d && target) {
      try {
        await db.plants.update(d.plantId, { bedId: target.id })
      } catch (err) {
        console.error(err)
        alert('Could not move the plant.')
      }
    }
  }

  async function assignPlant(plantId: string, bedId: string) {
    try {
      await db.plants.update(plantId, { bedId })
      setPickerBedId(null)
    } catch (err) {
      console.error(err)
      alert('Could not move the plant.')
    }
  }

  const arrangeBtn = arrange
    ? 'min-h-9 rounded-full bg-lime-700 px-3.5 text-sm font-semibold text-white active:bg-lime-800'
    : 'min-h-9 rounded-full border border-stone-300 bg-white px-3.5 text-sm font-semibold text-stone-700 active:bg-stone-200'

  return (
    <>
      <Header
        title="Garden"
        subtitle={arrange ? 'drag beds and plants into place' : 'tap a plant to open it'}
        backTo="/"
        right={
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setArrange((a) => !a)} className={arrangeBtn}>
              {arrange ? 'Done' : 'Arrange'}
            </button>
            {!arrange && (
              <Link
                to="/beds/new"
                aria-label="Add bed"
                className="flex size-9 items-center justify-center rounded-full bg-lime-700 text-white shadow-sm active:bg-lime-800"
              >
                <PlusIcon size={18} />
              </Link>
            )}
          </div>
        }
      />

      {beds !== undefined && bedList.length === 0 && (
        <div className="m-4 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-medium">No beds yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Split your garden into named areas — raised beds, borders, the
            greenhouse — then drop plants into them.
          </p>
          <Link
            to="/beds/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-lime-700 px-6 font-semibold text-white active:bg-lime-800"
          >
            Create your first bed
          </Link>
        </div>
      )}

      {bedList.length > 0 && (
        <div className="p-3">
          <div
            ref={wrapRef}
            className="overflow-x-auto rounded-2xl border border-stone-200 bg-stone-100"
          >
              <div
                ref={boardRef}
                className="relative select-none"
                style={{
                width: BOARD_W * s,
                height: BOARD_H * s,
                backgroundImage: 'radial-gradient(#d6d3d1 1px, transparent 1px)',
                backgroundSize: `${CELL * s}px ${CELL * s}px`,
                backgroundPosition: `${(CELL * s) / 2}px ${(CELL * s) / 2}px`,
              }}
            >
              {bedList.map((bed) => {
                const pos = posOf(bed)
                const colorCls = BED_COLORS[bed.color % BED_COLORS.length]
                const nameFont = Math.max(10, Math.round(15 * s))
                return (
                  <article
                    key={bed.id}
                    className={`absolute flex flex-col overflow-hidden rounded-xl border-2 ${colorCls} ${
                      arrange ? 'cursor-grab shadow-md active:cursor-grabbing' : 'shadow-sm'
                    } ${hoverBedId === bed.id ? 'ring-4 ring-lime-600 ring-offset-2' : ''}`}
                    style={{
                      left: pos.x * s,
                      top: pos.y * s,
                      width: bed.w * s,
                      height: bed.h * s,
                      touchAction: arrange ? 'none' : 'auto',
                    }}
                    onPointerDown={(e) => {
                      if (arrange) onBedPointerDown(e, bed)
                    }}
                    onPointerMove={(e) => {
                      if (arrange) onBedPointerMove(e, bed)
                    }}
                    onPointerUp={(e) => {
                      if (arrange) void onBedPointerUp(e, bed)
                    }}
                    onPointerCancel={(e) => {
                      if (arrange) void onBedPointerUp(e, bed)
                    }}
                  >
                    <header className="flex items-center justify-between gap-1 px-1.5 pt-1">
                      <h3 className="min-w-0 truncate font-bold" style={{ fontSize: nameFont }}>
                        {bed.name}
                      </h3>
                      {!arrange && (
                        <Link
                          to={`/beds/${bed.id}/edit`}
                          aria-label={`Edit bed ${bed.name}`}
                          className="shrink-0 rounded-full p-1 active:bg-white/60"
                        >
                          <PencilIcon size={Math.max(11, Math.round(13 * s))} />
                        </Link>
                      )}
                    </header>
                    <div className="flex min-h-0 flex-1 flex-wrap content-start items-start gap-1 overflow-y-auto p-1.5">
                      {plantsOf(bed.id).map((p) => (
                        <PlantChip key={p.id} plant={p} link={!arrange} scale={s} />
                      ))}
                      <button
                        type="button"
                        aria-label={`Add plant to ${bed.name}`}
                        onClick={() => setPickerBedId(bed.id)}
                        className="flex items-center justify-center rounded-full bg-white/85 font-bold text-stone-500 shadow-sm active:bg-white"
                        style={{
                          width: Math.max(18, Math.round(24 * s)),
                          height: Math.max(18, Math.round(24 * s)),
                          fontSize: Math.max(10, Math.round(14 * s)),
                        }}
                      >
                        +
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          {arrange && (
            <section className="mt-3">
              <h2 className="mb-1 text-sm font-semibold text-stone-500">Not placed yet</h2>
              {plants === undefined ? null : unassigned.length === 0 ? (
                <p className="text-xs text-stone-400">Every plant has a bed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {unassigned.map((p) => (
                    <span
                      key={p.id}
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
                      <span className="truncate">{p.name}</span>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-stone-400">
                Drag a plant onto a bed to place it. Drag beds to move them.
              </p>
            </section>
          )}
        </div>
      )}

      {pickerBed && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-stone-900/40 p-4 sm:items-center"
          onClick={() => setPickerBedId(null)}
        >
          <div
            className={`${sectionClass} max-h-96 w-full max-w-md overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold">Add plant to {pickerBed.name}</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPickerBedId(null)}
                className="flex size-8 items-center justify-center rounded-full text-stone-500 active:bg-stone-200"
              >
                <XIcon size={16} />
              </button>
            </div>
            {(() => {
              const candidates = plantList.filter((p) => p.bedId !== pickerBed.id)
              if (candidates.length === 0) {
                return (
                  <p className="py-4 text-center text-sm text-stone-400">
                    No plants to add — create one from the home screen first.
                  </p>
                )
              }
              return (
                <ul className="space-y-1">
                  {candidates.map((p) => {
                    const currentBed = p.bedId
                      ? bedList.find((b) => b.id === p.bedId)
                      : undefined
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => void assignPlant(p.id, pickerBed.id)}
                          className="flex w-full items-center gap-3 rounded-xl p-2 text-left active:bg-stone-100"
                        >
                          <PhotoThumb photoId={p.photoId} className="size-10 shrink-0 rounded-lg" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{p.name}</span>
                            {currentBed ? (
                              <span className="block truncate text-xs text-stone-400">
                                currently in {currentBed.name}
                              </span>
                            ) : (
                              <span className="block text-xs text-stone-400">not placed yet</span>
                            )}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}

