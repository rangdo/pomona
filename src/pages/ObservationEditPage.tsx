import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, type Observation } from '../db/db'
import { newId } from '../lib/ids'
import { processImage } from '../lib/image'
import { useLiveQuery } from '../lib/hooks'
import { Header } from '../components/Header'
import { PhotoThumb } from '../components/PhotoThumb'
import { ChipPicker } from '../components/Chips'
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
} from '../components/styles'

interface NewPhoto {
  full: Blob
  thumb: Blob
  url: string
}

interface Selections {
  part: string[]
  condition: string[]
  treatment: string[]
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function dateParts(ts: number) {
  const d = new Date(ts)
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={sectionClass}>
      <h2 className="mb-3 text-sm font-semibold text-stone-500">{title}</h2>
      {children}
    </section>
  )
}

export function ObservationEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const obs = useLiveQuery(() => db.observations.get(id), [id])
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

  const [hydrated, setHydrated] = useState(false)
  const [plantId, setPlantId] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [timeStr, setTimeStr] = useState('')
  const [sel, setSel] = useState<Selections>({ part: [], condition: [], treatment: [] })
  const [fruitCount, setFruitCount] = useState('')
  const [weightG, setWeightG] = useState('')
  const [note, setNote] = useState('')
  const [newPhoto, setNewPhoto] = useState<NewPhoto | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [saving, setSaving] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (hydrated || !obs) return
    const parts = dateParts(obs.timestamp)
    setPlantId(obs.plantId)
    setDateStr(parts.date)
    setTimeStr(parts.time)
    setSel({
      part: [...obs.parts],
      condition: [...obs.conditions],
      treatment: [...obs.treatments],
    })
    setFruitCount(obs.fruitCount !== undefined ? String(obs.fruitCount) : '')
    setWeightG(obs.weightG !== undefined ? String(obs.weightG) : '')
    setNote(obs.note ?? '')
    setHydrated(true)
  }, [obs, hydrated])

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void (async () => {
      try {
        const { full, thumb } = await processImage(file)
        setNewPhoto((prev) => {
          if (prev) URL.revokeObjectURL(prev.url)
          return { full, thumb, url: URL.createObjectURL(full) }
        })
        setPhotoRemoved(false)
      } catch (err) {
        console.error(err)
        alert('Could not read that photo — please try again.')
      }
    })()
  }

  function clearNewPhoto() {
    if (newPhoto) URL.revokeObjectURL(newPhoto.url)
    setNewPhoto(null)
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

  async function save() {
    if (!obs || saving || !plantId) return
    setSaving(true)
    try {
      const [y, m, d] = dateStr.split('-').map(Number)
      const [hh, mm] = timeStr.split(':').map(Number)
      let timestamp = obs.timestamp
      if (y && m && d && !Number.isNaN(hh) && !Number.isNaN(mm)) {
        timestamp = new Date(y, m - 1, d, hh, mm).getTime()
      }
      await db.transaction('rw', db.photos, db.observations, async () => {
        let photoId = obs.photoId
        if (newPhoto) {
          if (obs.photoId) await db.photos.delete(obs.photoId)
          photoId = newId()
          const now = Date.now()
          await db.photos.add({
            id: photoId,
            blob: newPhoto.full,
            thumb: newPhoto.thumb,
            takenAt: now,
            createdAt: now,
          })
        } else if (photoRemoved) {
          if (obs.photoId) await db.photos.delete(obs.photoId)
          photoId = undefined
        }
        const updated: Observation = {
          ...obs,
          plantId,
          timestamp,
          parts: sel.part,
          conditions: sel.condition,
          treatments: sel.treatment,
          fruitCount: fruitCount ? Number(fruitCount) : undefined,
          weightG: weightG ? Number(weightG) : undefined,
          note: note.trim() || undefined,
          photoId,
        }
        await db.observations.put(updated)
      })
      navigate(`/plants/${plantId}`)
    } catch (err) {
      console.error(err)
      alert('Saving failed — please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (plants !== undefined && !obs) {
    return (
      <>
        <Header title="Edit observation" backTo="/" />
        <p className="px-4 py-8 text-center text-sm text-stone-400">Observation not found.</p>
      </>
    )
  }

  if (!obs || !hydrated) {
    return (
      <>
        <Header title="Edit observation" backTo="/" />
        <p className="px-4 py-8 text-center text-sm text-stone-400">Loading…</p>
      </>
    )
  }

  const showCurrentPhoto = Boolean(obs.photoId) && !photoRemoved

  return (
    <>
      <Header title="Edit observation" backTo={`/plants/${obs.plantId}`} />

      <div className="space-y-3 p-3">
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
          <div className="flex items-center gap-3">
            {newPhoto ? (
              <img
                src={newPhoto.url}
                alt="New photo preview"
                className="size-24 rounded-xl bg-stone-900/5 object-contain"
              />
            ) : showCurrentPhoto ? (
              <PhotoThumb photoId={obs.photoId} className="size-24 shrink-0 rounded-xl" />
            ) : (
              <div className="flex size-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-300 p-2 text-center text-xs text-stone-400">
                no photo
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="min-h-10 rounded-full bg-lime-700 px-4 text-sm font-semibold text-white active:bg-lime-800"
              >
                {newPhoto ? 'Replace new photo' : 'Take photo'}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="min-h-10 flex-1 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-600 active:bg-stone-200"
                >
                  Gallery
                </button>
                {newPhoto ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearNewPhoto()
                      setPhotoRemoved(false)
                    }}
                    className="min-h-10 flex-1 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-600 active:bg-stone-200"
                  >
                    Undo
                  </button>
                ) : (
                  showCurrentPhoto && (
                    <button
                      type="button"
                      onClick={() => setPhotoRemoved(true)}
                      className="min-h-10 flex-1 rounded-full border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-600 active:bg-rose-50"
                    >
                      Remove
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
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
        </Section>

        <Section title="When was this?">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Date</span>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Time</span>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
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
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputClass} py-2.5`}
          />
        </Section>

        <div className="flex gap-3 pb-4">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!plantId || saving}
            className={`${primaryButtonClass} flex-1`}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/plants/${obs.plantId}`)}
            className={`${secondaryButtonClass} flex-1`}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
