import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db, type Observation } from '../db/db'
import { newId } from '../lib/ids'
import { readPhotoMeta, type PhotoMeta } from '../lib/exif'
import { processImage } from '../lib/image'
import { useLiveQuery } from '../lib/hooks'
import { Header } from '../components/Header'
import { ChipPicker } from '../components/Chips'
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
} from '../components/styles'
import { CameraIcon } from '../components/icons'
import { formatDate, formatTime } from '../lib/time'

interface Prepared {
  full: Blob
  thumb: Blob
  previewUrl: string
  takenAt: number
}

interface Selections {
  part: string[]
  condition: string[]
  treatment: string[]
}

const EMPTY_SELECTION: Selections = { part: [], condition: [], treatment: [] }

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={sectionClass}>
      <h2 className="mb-3 text-sm font-semibold text-stone-500">{title}</h2>
      {children}
    </section>
  )
}

export function CapturePage() {
  const { plantId: paramPlantId } = useParams()
  const navigate = useNavigate()

  const plants = useLiveQuery(() => db.plants.orderBy('name').toArray(), [])
  const partTags = useLiveQuery(
    () => db.tags.where('category').equals('part').sortBy('order'),
    [],
  )
  const conditionTags = useLiveQuery(
    () => db.tags.where('category').equals('condition').sortBy('order'),
    [],
  )
  const treatmentTags = useLiveQuery(
    () => db.tags.where('category').equals('treatment').sortBy('order'),
    [],
  )

  const [plantId, setPlantId] = useState(paramPlantId ?? '')
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [meta, setMeta] = useState<PhotoMeta | null>(null)
  const [sel, setSel] = useState<Selections>(EMPTY_SELECTION)
  const [fruitCount, setFruitCount] = useState('')
  const [weightG, setWeightG] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (paramPlantId) setPlantId(paramPlantId)
  }, [paramPlantId])

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void (async () => {
      try {
        const photoMeta = await readPhotoMeta(file)
        const { full, thumb } = await processImage(file)
        setPrepared((prev) => {
          if (prev) URL.revokeObjectURL(prev.previewUrl)
          return {
            full,
            thumb,
            previewUrl: URL.createObjectURL(full),
            takenAt: photoMeta.takenAt,
          }
        })
        setMeta(photoMeta)
      } catch (err) {
        console.error(err)
        alert('Could not read that photo — please try again.')
      }
    })()
  }

  function clearPhoto() {
    if (prepared) URL.revokeObjectURL(prepared.previewUrl)
    setPrepared(null)
    setMeta(null)
  }

  function toggle(category: keyof Selections, label: string) {
    setSel((s) => {
      const list = s[category]
      const next = list.includes(label)
        ? list.filter((l) => l !== label)
        : [...list, label]
      return { ...s, [category]: next }
    })
  }

  async function save(andAnother: boolean) {
    if (!plantId || saving) return
    setSaving(true)
    try {
      const now = Date.now()
      const obs: Observation = {
        id: newId(),
        plantId,
        timestamp: meta?.takenAt ?? now,
        parts: sel.part,
        conditions: sel.condition,
        treatments: sel.treatment,
        ...(fruitCount ? { fruitCount: Number(fruitCount) } : {}),
        ...(weightG ? { weightG: Number(weightG) } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(meta?.gps ? { gps: meta.gps } : {}),
        createdAt: now,
      }
      await db.transaction('rw', db.photos, db.observations, async () => {
        if (prepared) {
          const photoId = newId()
          await db.photos.add({
            id: photoId,
            blob: prepared.full,
            thumb: prepared.thumb,
            takenAt: prepared.takenAt,
            createdAt: now,
          })
          obs.photoId = photoId
        }
        await db.observations.add(obs)
      })
      if (andAnother) {
        clearPhoto()
        setSel(EMPTY_SELECTION)
        setFruitCount('')
        setWeightG('')
        setNote('')
      } else {
        navigate(`/plants/${plantId}`)
      }
    } catch (err) {
      console.error(err)
      alert('Saving failed — please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (plants && plants.length === 0) {
    return (
      <>
        <Header title="New observation" backTo="/" />
        <div className="m-4 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-medium">Add a plant first</p>
          <p className="mt-1 text-sm text-stone-500">
            Every observation belongs to a plant in your journal.
          </p>
          <Link
            to="/plants/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-lime-700 px-6 font-semibold text-white active:bg-lime-800"
          >
            Add a plant
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="New observation" backTo={paramPlantId ? `/plants/${paramPlantId}` : '/'} />

      <form
        className="space-y-3 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void save(false)
        }}
      >
        <section className={sectionClass}>
          <label className="block">
            <span className={labelClass}>Plant</span>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a plant…</option>
              {plants?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.variety ? ` (${p.variety})` : ''}
                </option>
              ))}
            </select>
          </label>
        </section>

        <Section title="Photo">
          {!prepared ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className={`${primaryButtonClass} min-h-24 flex-col gap-1`}
              >
                <CameraIcon size={26} />
                Take photo
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className={`${secondaryButtonClass} flex-col gap-1 text-sm`}
              >
                From gallery
              </button>
            </div>
          ) : (
            <div>
              <img
                src={prepared.previewUrl}
                alt="Photo preview"
                className="max-h-72 w-full rounded-2xl bg-stone-900/5 object-contain"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                <span>
                  Taken {formatDate(prepared.takenAt)}, {formatTime(prepared.takenAt)}
                  {meta?.gps ? ' · GPS tagged' : ''}
                </span>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="font-semibold text-rose-600"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <p className="mt-2 text-xs text-stone-400">Photo is optional — notes alone are fine.</p>
        </Section>

        <Section title="What did you look at?">
          <ChipPicker tags={partTags ?? []} selected={sel.part} onToggle={(l) => toggle('part', l)} />
        </Section>

        <Section title="How does it look?">
          <ChipPicker
            tags={conditionTags ?? []}
            selected={sel.condition}
            onToggle={(l) => toggle('condition', l)}
          />
        </Section>

        <Section title="What did you do?">
          <ChipPicker
            tags={treatmentTags ?? []}
            selected={sel.treatment}
            onToggle={(l) => toggle('treatment', l)}
          />
        </Section>

        <Section title="Harvest details">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Fruit count</span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder="e.g. 24"
                value={fruitCount}
                onChange={(e) => setFruitCount(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Weight (g)</span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="decimal"
                placeholder="e.g. 850"
                value={weightG}
                onChange={(e) => setWeightG(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        </Section>

        <Section title="Notes">
          <textarea
            rows={2}
            placeholder="Anything worth remembering…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputClass} py-2.5`}
          />
        </Section>

        <div className="flex gap-3 pb-4">
          <button
            type="submit"
            disabled={!plantId || saving}
            className={`${primaryButtonClass} flex-1`}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            disabled={!plantId || saving}
            onClick={() => void save(true)}
            className={`${secondaryButtonClass} flex-1`}
          >
            Save &amp; add another
          </button>
        </div>
      </form>
    </>
  )
}
