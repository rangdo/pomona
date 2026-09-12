import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../db/db'
import { newId } from '../lib/ids'
import {
  BED_COLORS,
  CELL,
  SIZE_PRESETS,
  clampPos,
  defaultPlacement,
  sizeKeyOf,
} from '../lib/board'
import { useLiveQuery } from '../lib/hooks'
import { Header } from '../components/Header'
import { inputClass, labelClass, primaryButtonClass, sectionClass } from '../components/styles'

export function BedEditPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const existing = useLiveQuery(() => (id ? db.beds.get(id) : undefined), [id])
  const beds = useLiveQuery(() => db.beds.toArray(), [])

  const [name, setName] = useState('')
  const [color, setColor] = useState<number | null>(null)
  const [size, setSize] = useState<'S' | 'M' | 'L'>('M')
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
      setSize(sizeKeyOf(existing.w, existing.h))
      setHydrated(true)
    }
  }, [existing, editing, hydrated])

  useEffect(() => {
    if (!editing && color === null && beds) {
      setColor(beds.length % BED_COLORS.length)
    }
  }, [beds, editing, color])

  const preset = SIZE_PRESETS.find((p) => p.key === size) ?? SIZE_PRESETS[1]

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      if (editing && id && existing) {
        const w = preset.wCells * CELL
        const h = preset.hCells * CELL
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
          preset.wCells,
          preset.hCells,
          (beds ?? []).map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h })),
        )
        await db.beds.add({
          id: newId(),
          name: trimmed,
          color: color ?? 0,
          x: pos.x,
          y: pos.y,
          w: preset.wCells * CELL,
          h: preset.hCells * CELL,
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
          <div className="grid grid-cols-3 gap-2">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={size === p.key}
                onClick={() => setSize(p.key)}
                className={`min-h-11 rounded-xl border px-2 text-sm font-medium ${
                  size === p.key
                    ? 'border-lime-700 bg-lime-700 text-white'
                    : 'border-stone-300 bg-white text-stone-700 active:bg-stone-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-400">
            {editing
              ? 'The bed keeps its spot — drag it around on the board.'
              : 'Placed in the first free spot — drag it around on the board.'}
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
