import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, type Location } from '../db/db'
import { newId } from '../lib/ids'
import { isPdf, processLocationImage } from '../lib/image'
import { AREA_COLORS } from '../lib/palette'
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

export function LocationEditorPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()

  const existing = useLiveQuery(() => (id ? db.locations.get(id) : undefined), [id])

  const [name, setName] = useState('')
  const [color, setColor] = useState<number | null>(null)
  const [photo, setPhoto] = useState<NewPhoto | null>(null)
  const [pdfOriginal, setPdfOriginal] = useState<Blob | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (hydrated) return
    if (!editing) {
      setHydrated(true)
      return
    }
    if (existing) {
      setName(existing.name)
      setColor(existing.color)
      setHydrated(true)
    }
  }, [existing, editing, hydrated])

  useEffect(() => {
    if (!editing && color === null) {
      const count = db.locations.count()
      void count.then((n) => setColor(n % AREA_COLORS.length))
    }
  }, [editing, color])

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void (async () => {
      try {
        const { full, thumb } = await processLocationImage(file)
        setPhoto((prev) => {
          if (prev) URL.revokeObjectURL(prev.url)
          return { full, thumb, url: URL.createObjectURL(full) }
        })
        setPdfOriginal(isPdf(file) ? file : null)
        setPhotoRemoved(false)
      } catch (err) {
        console.error(err)
        alert('Could not read that image — please try again.')
      }
    })()
  }

  function clearPhoto() {
    if (photo) URL.revokeObjectURL(photo.url)
    setPhoto(null)
    setPdfOriginal(null)
    setPhotoRemoved(false)
  }

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const now = Date.now()
      const locationId = editing ? (id as string) : newId()
      await db.transaction('rw', db.photos, db.locations, async () => {
        let imagePhotoId = photoRemoved ? undefined : existing?.imagePhotoId
        if (photo) {
          if (existing?.imagePhotoId) await db.photos.delete(existing.imagePhotoId)
          imagePhotoId = newId()
          await db.photos.add({
            id: imagePhotoId,
            blob: photo.full,
            thumb: photo.thumb,
            takenAt: now,
            createdAt: now,
          })
        }
        const location: Location = {
          id: locationId,
          name: trimmed,
          color: color ?? 0,
          imagePhotoId,
          sourcePdf: photo
            ? pdfOriginal ?? undefined
            : photoRemoved
              ? undefined
              : existing?.sourcePdf,
          createdAt: existing?.createdAt ?? now,
        }
        await db.locations.put(location)
      })
      navigate(`/locations/${locationId}`)
    } catch (err) {
      console.error(err)
      alert('Saving failed — please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!id || saving) return
    if (!confirm('Delete this location? Plants in it will stay, but become unassigned.')) return
    setSaving(true)
    try {
      await db.transaction('rw', db.locations, db.plants, db.photos, async () => {
        const location = await db.locations.get(id)
        await db.plants.where('locationId').equals(id).modify((plant) => {
          delete plant.locationId
          delete plant.pinX
          delete plant.pinY
        })
        if (location?.imagePhotoId) await db.photos.delete(location.imagePhotoId)
        await db.locations.delete(id)
      })
      navigate('/locations')
    } catch (err) {
      console.error(err)
      alert('Delete failed — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const showCurrentImage = Boolean(existing?.imagePhotoId) && !photoRemoved

  return (
    <>
      <Header
        title={editing ? 'Edit location' : 'New location'}
        subtitle={editing ? existing?.name : 'an area of your garden'}
        backTo={editing && id ? `/locations/${id}` : '/locations'}
      />

      <div className="space-y-3 p-3">
        <section className={sectionClass}>
          <span className={labelClass}>Image</span>
          <div className="flex items-center gap-3">
            {photo ? (
              <img
                src={photo.url}
                alt="Location preview"
                className="size-24 rounded-xl bg-stone-900/5 object-cover"
              />
            ) : showCurrentImage ? (
              <PhotoThumb
                photoId={existing?.imagePhotoId}
                className="size-24 shrink-0 rounded-xl"
              />
            ) : (
              <div className="flex size-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-300 p-2 text-center text-xs text-stone-400">
                no image
              </div>
            )}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="min-h-10 rounded-full bg-lime-700 px-4 text-sm font-semibold text-white active:bg-lime-800"
                >
                  {photo ? 'Replace new' : 'Take photo'}
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="min-h-10 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-600 active:bg-stone-200"
                >
                  Gallery
                </button>
              </div>
              {photo ? (
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="min-h-10 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-600 active:bg-stone-200"
                >
                  Undo
                </button>
              ) : (
                showCurrentImage && (
                  <button
                    type="button"
                    onClick={() => setPhotoRemoved(true)}
                    className="min-h-10 rounded-full border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-600 active:bg-rose-50"
                  >
                    Remove image
                  </button>
                )
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-400">
            A photo of this area lets you pin plants onto it — a satellite
            screenshot, a sketch or a garden plan PDF (first page) works too.
          </p>
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
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
        </section>

        <section className={sectionClass}>
          <label className="block">
            <span className={labelClass}>Name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Back garden, Allotment, Greenhouse"
              className={inputClass}
            />
          </label>
        </section>

        <section className={sectionClass}>
          <span className={labelClass}>Colour</span>
          <div className="flex flex-wrap gap-2">
            {AREA_COLORS.map((classes, i) => (
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
              The location disappears; its plants stay in the journal, unassigned,
              with their pins cleared.
            </p>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={saving}
              className="min-h-10 w-full rounded-full border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-600 active:bg-rose-50"
            >
              Delete location
            </button>
          </div>
        )}
      </div>
    </>
  )
}
