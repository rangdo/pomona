import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, type Plant } from '../db/db'
import { newId } from '../lib/ids'
import { processImage } from '../lib/image'
import { useLiveQuery } from '../lib/hooks'
import { Header } from '../components/Header'
import { PhotoThumb } from '../components/PhotoThumb'
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  sectionClass,
} from '../components/styles'

interface NewPhoto {
  full: Blob
  thumb: Blob
  url: string
}

export function PlantEditPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const existing = useLiveQuery(() => (id ? db.plants.get(id) : undefined), [id])
  const beds = useLiveQuery(() => db.beds.toArray(), [])

  const [name, setName] = useState('')
  const [variety, setVariety] = useState('')
  const [species, setSpecies] = useState('')
  const [plantedDate, setPlantedDate] = useState('')
  const [location, setLocation] = useState('')
  const [bedId, setBedId] = useState('')
  const [photo, setPhoto] = useState<NewPhoto | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (hydrated) return
    if (!editing) {
      setHydrated(true)
      return
    }
    if (existing) {
      setName(existing.name)
      setVariety(existing.variety ?? '')
      setSpecies(existing.species ?? '')
      setPlantedDate(existing.plantedDate ?? '')
      setLocation(existing.location ?? '')
      setBedId(existing.bedId ?? '')
      setHydrated(true)
    }
  }, [existing, editing, hydrated])

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void (async () => {
      try {
        const { full, thumb } = await processImage(file)
        setPhoto((prev) => {
          if (prev) URL.revokeObjectURL(prev.url)
          return { full, thumb, url: URL.createObjectURL(full) }
        })
      } catch (err) {
        console.error(err)
        alert('Could not read that photo — please try again.')
      }
    })()
  }

  function clearPhoto() {
    if (photo) URL.revokeObjectURL(photo.url)
    setPhoto(null)
  }

  async function save() {
    const trimmedName = name.trim()
    if (!trimmedName || saving) return
    setSaving(true)
    try {
      const now = Date.now()
      const plantId = editing ? (id as string) : newId()
      await db.transaction('rw', db.photos, db.plants, async () => {
        let photoId = existing?.photoId
        if (photo) {
          if (existing?.photoId) await db.photos.delete(existing.photoId)
          photoId = newId()
          await db.photos.add({
            id: photoId,
            blob: photo.full,
            thumb: photo.thumb,
            takenAt: now,
            createdAt: now,
          })
        }
        const plant: Plant = {
          id: plantId,
          name: trimmedName,
          variety: variety.trim() || undefined,
          species: species.trim() || undefined,
          plantedDate: plantedDate || undefined,
          location: location.trim() || undefined,
          bedId: bedId || undefined,
          photoId,
          createdAt: existing?.createdAt ?? now,
        }
        await db.plants.put(plant)
      })
      navigate(`/plants/${plantId}`)
    } catch (err) {
      console.error(err)
      alert('Saving failed — please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!id || saving) return
    if (!confirm('Delete this plant and ALL of its observations? This cannot be undone.')) return
    setSaving(true)
    try {
      await db.transaction('rw', db.plants, db.observations, db.photos, async () => {
        const obs = await db.observations.where('plantId').equals(id).toArray()
        const photoIds = obs
          .map((o) => o.photoId)
          .filter((x): x is string => Boolean(x))
        const plant = await db.plants.get(id)
        if (plant?.photoId) photoIds.push(plant.photoId)
        await db.photos.bulkDelete([...new Set(photoIds)])
        await db.observations.bulkDelete(obs.map((o) => o.id))
        await db.plants.delete(id)
      })
      navigate('/', { replace: true })
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
        title={editing ? 'Edit plant' : 'Add plant'}
        subtitle={editing ? existing?.name : 'new to the journal'}
        backTo={editing && id ? `/plants/${id}` : '/'}
      />

      <div className="space-y-3 p-3">
        <section className={sectionClass}>
          <span className={labelClass}>Photo</span>
          <div className="flex items-center gap-3">
            {photo ? (
              <img
                src={photo.url}
                alt="Plant preview"
                className="size-24 rounded-xl bg-stone-900/5 object-contain"
              />
            ) : (
              <PhotoThumb
                photoId={existing?.photoId}
                className="size-24 shrink-0 rounded-xl"
              />
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="min-h-10 rounded-full bg-lime-700 px-4 text-sm font-semibold text-white active:bg-lime-800"
              >
                {photo ? 'Replace photo' : 'Take photo'}
              </button>
              {photo && (
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="min-h-10 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-600 active:bg-stone-200"
                >
                  Keep old photo
                </button>
              )}
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
        </section>

        <section className={`${sectionClass} space-y-3`}>
          <label className="block">
            <span className={labelClass}>Name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Backyard plum"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Variety</span>
            <input
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="e.g. Victoria"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Species</span>
            <input
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="e.g. Plum"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Planted date</span>
            <input
              type="date"
              value={plantedDate}
              onChange={(e) => setPlantedDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Bed (area)</span>
            <select
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              className={inputClass}
            >
              <option value="">— not placed on the map yet —</option>
              {(beds ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Location</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. South bed, by the fence"
              className={inputClass}
            />
          </label>
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
              Deletes the plant, its photos and every observation it has.
            </p>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={saving}
              className="min-h-10 w-full rounded-full border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-600 active:bg-rose-50"
            >
              Delete plant
            </button>
          </div>
        )}
      </div>
    </>
  )
}
