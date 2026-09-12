import { beforeAll, describe, expect, it } from 'vitest'
import { db } from './db'
import { newId } from '../lib/ids'

beforeAll(async () => {
  await db.open()
})

describe('default tags', () => {
  it('seeds chips in every category on first run', async () => {
    const parts = await db.tags.where('category').equals('part').sortBy('order')
    const conditions = await db.tags
      .where('category')
      .equals('condition')
      .sortBy('order')
    const treatments = await db.tags
      .where('category')
      .equals('treatment')
      .sortBy('order')
    expect(parts.length).toBeGreaterThanOrEqual(5)
    expect(conditions.map((t) => t.label)).toContain('healthy')
    expect(treatments.map((t) => t.label)).toContain('pruned')
  })
})

describe('observation storage', () => {
  it('round-trips observations with photos and queries by plant', async () => {
    const plantA = newId()
    const plantB = newId()
    await db.plants.bulkAdd([
      { id: plantA, name: 'Plum A', createdAt: Date.now() },
      { id: plantB, name: 'Plum B', createdAt: Date.now() },
    ])

    const blob = new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' })
    const photoId = newId()
    await db.photos.add({
      id: photoId,
      blob,
      thumb: blob,
      takenAt: 1_700_000_000_000,
      createdAt: Date.now(),
    })

    const t1 = new Date(2026, 0, 10).getTime()
    const t2 = new Date(2026, 1, 5).getTime()
    const t3 = new Date(2026, 1, 20).getTime()
    await db.observations.bulkAdd([
      {
        id: newId(),
        plantId: plantA,
        timestamp: t2,
        parts: ['fruit'],
        conditions: ['healthy'],
        treatments: ['harvested'],
        fruitCount: 12,
        weightG: 900,
        photoId,
        createdAt: Date.now(),
      },
      {
        id: newId(),
        plantId: plantA,
        timestamp: t1,
        parts: ['blossom'],
        conditions: [],
        treatments: ['pruned'],
        createdAt: Date.now(),
      },
      {
        id: newId(),
        plantId: plantB,
        timestamp: t3,
        parts: ['leaf'],
        conditions: ['pest damage'],
        treatments: ['sprayed'],
        createdAt: Date.now(),
      },
    ])

    const aObs = await db.observations
      .where('plantId')
      .equals(plantA)
      .sortBy('timestamp')
    expect(aObs.map((o) => o.timestamp)).toEqual([t1, t2])
    const withPhoto = aObs.find((o) => o.photoId)
    expect(withPhoto?.fruitCount).toBe(12)
    const storedPhoto = await db.photos.get(photoId)
    expect(storedPhoto?.blob.size).toBeGreaterThan(0)

    const bObs = await db.observations
      .where('plantId')
      .equals(plantB)
      .sortBy('timestamp')
    expect(bObs).toHaveLength(1)
    expect(bObs[0].parts).toEqual(['leaf'])
  })

  it('cascades plant deletion to observations and photos', async () => {
    const plantId = newId()
    const photoId = newId()
    await db.plants.add({ id: plantId, name: 'Doomed', createdAt: Date.now() })
    await db.photos.add({
      id: photoId,
      blob: new Blob(['x']),
      thumb: new Blob(['x']),
      takenAt: Date.now(),
      createdAt: Date.now(),
    })
    const obsId = newId()
    await db.observations.add({
      id: obsId,
      plantId,
      timestamp: Date.now(),
      parts: [],
      conditions: [],
      treatments: [],
      photoId,
      createdAt: Date.now(),
    })

    await db.transaction('rw', db.plants, db.observations, db.photos, async () => {
      await db.observations.where('plantId').equals(plantId).delete()
      await db.plants.delete(plantId)
      await db.photos.delete(photoId)
    })

    expect(await db.plants.get(plantId)).toBeUndefined()
    expect(await db.observations.where('plantId').equals(plantId).count()).toBe(0)
    expect(await db.photos.get(photoId)).toBeUndefined()
  })
})
