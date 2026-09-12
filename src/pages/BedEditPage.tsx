import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../db/db'
import { newId } from '../lib/ids'
import {
  BED_COLORS,
  CELL,
  MAX_BED_H_CELLS,
  MAX_BED_W_CELLS,
  cellsToCm,
  clampPos,
  cmToCells,
  defaultPlacement,
} from '../lib/board'
import { useLiveQuery } from '../lib/hooks'
import { Header } from '../components/Header'
import { inputClass, labelClass, primaryButtonClass, sectionClass } from '../components/styles'

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (v: number) => void
}) {
  const btn =
    'flex size-10 items-center justify-center rounded-full border border-stone-300 bg-white text-lg font-bold text-stone-700 active:bg-stone-200 disabled:opacity-40'
  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2">
      <span className="text-sm font-medium text-stone-600">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - step)}
          className={btn}
        >
          −
        </button>
        <span className="w-14 text-center text-lg font-bold tabular-nums">
          {value}
          {suffix ? ` ${suffix}` : ''}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(value + step)}
          className={btn}
        >
          +
        </button>
      </div>
    </div>
  )
}

export function BedEditPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const existing = useLiveQuery(() => (id ? db.beds.get(id) : undefined), [id])
  const beds = useLiveQuery(() => db.beds.toArray(), [])

  const [name, setName] = useState('')
  const [color, setColor] = useState<number | null>(null)
  const [wCells, setWCells] = useState(4)
  const [hCells, setHCells] = useState(3)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (hydrated) return
    if (!editing) {
      setHydrated(true)
      return
    }
    if (existing) {
      setName(existing.name)
      setColor(existing.color)
      setWCells(Math.max(1, Math.round(existing.w / CELL)))
      setHCells(Math.max(1, Math.round(existing.h / CELL)))
      setHydrated(true)
    }
  }, [existing, editing, hydrated])

  useEffect(() => {
    if (!editing && color === null && beds) {
      setColor(beds.length % BED_COLORS.length)
    }
  }, [beds, editing, color])

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      if (editing && id && existing) {
        const w = wCells * CELL
        const h = hCells * CELL
        const pos = clampPos(existing.x, existing.y, w, h)
        await db.beds.put({
          ...existing,
          name: trimmed,
          color: color ?? 0,
          x: pos.x,
          y: pos.y,
          w,
          h,
        })
      } else {
        const pos = defaultPlacement(
          wCells,
          hCells,
          (beds ?? []).map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h })),
        )
        await db.beds.add({
          id: newId(),
          name: trimmed,
          color: color ?? 0,
          x: pos.x,
          y: pos.y,
          w: wCells * CELL,
          h: hCells * CELL,
          createdAt: Date.now(),
        })
      }
      navigate('/map')
    } catch (err) {
      console.error(err)
      alert('Saving failed — please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!id || saving) return
    if (!confirm('Delete this bed? Plants in it will stay, but become unassigned.')) return
    setSaving(true)
    try {
      await db.transaction('rw', db.beds, db.plants, async () => {
        await db.plants.where('bedId').equals(id).modify((plant) => {
          delete plant.bedId
        })
        await db.beds.delete(id)
      })
      navigate('/map')
    } catch (err) {
      console.error(err)
      alert('Delete failed — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header
        title={editing ? 'Edit bed' : 'New bed'}
        subtitle={editing ? existing?.name : 'an area of your garden'}
        backTo="/map"
      />

      <div className="space-y-3 p-3">
        <section className={sectionClass}>
          <label className="block">
            <span className={labelClass}>Name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. South bed, by the fence"
              className={inputClass}
            />
          </label>
        </section>

        <section className={sectionClass}>
          <span className={labelClass}>Colour</span>
          <div className="flex flex-wrap gap-2">
            {BED_COLORS.map((classes, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Colour ${i + 1}`}
                aria-pressed={color === i}
                onClick={() => setColor(i)}
                className={`size-10 rounded-xl border-2 ${classes} ${
                  color === i ? 'ring-2 ring-stone-800 ring-offset-2' : ''
                }`}
              />
            ))}
          </div>
        </section>

        <section className={sectionClass}>
          <span className={labelClass}>Size</span>
          <div className="space-y-2">
            <Stepper
              label="Width"
              suffix="cm"
              step={cellsToCm(1)}
              value={cellsToCm(wCells)}
              min={cellsToCm(1)}
              max={cellsToCm(MAX_BED_W_CELLS)}
              onChange={(cm) => setWCells(cmToCells(cm))}
            />
            <Stepper
              label="Height"
              suffix="cm"
              step={cellsToCm(1)}
              value={cellsToCm(hCells)}
              min={cellsToCm(1)}
              max={cellsToCm(MAX_BED_H_CELLS)}
              onChange={(cm) => setHCells(cmToCells(cm))}
            />
          </div>
          <p className="mt-2 text-xs text-stone-400">
            1 grid square ≈ 25 cm — a 4 × 4 bed is 1 × 1 m. Currently{' '}
            {cellsToCm(wCells)} × {cellsToCm(hCells)} cm.
          </p>
        </section>

        <div className="flex gap-3 pb-4">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!name.trim() || saving}
            className={`${primaryButtonClass} flex-1`}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {editing && existing && (
          <div className={`${sectionClass} border-rose-200`}>
            <h2 className="mb-1 text-sm font-semibold text-rose-700">Danger zone</h2>
            <p className="mb-3 text-xs text-stone-500">
              The bed disappears; its plants stay in the journal, unassigned.
            </p>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={saving}
              className="min-h-10 w-full rounded-full border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-600 active:bg-rose-50"
            >
              Delete bed
            </button>
          </div>
        )}
      </div>
    </>
  )
}
