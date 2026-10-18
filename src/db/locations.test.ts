import Dexie from 'dexie'
import { beforeAll, describe, expect, it } from 'vitest'
import { PomonaDB, db } from './db'
import { newId } from '../lib/ids'

beforeAll(async () => {
  await db.open()
})

describe('v2 → v5 migration', () => {
  it('deletes beds, strips bedId, rescues name into variety, preserves observations', async () => {
    const name = 'pomona-migration-v5-test'
    const legacy = new Dexie(name)
    legacy.version(1).stores({
      plants: 'id, name, createdAt',
      observations: 'id, plantId, timestamp, [plantId+timestamp]',
      photos: 'id, takenAt',
      tags: 'id, category, [category+order]',
    })
    legacy.version(2).stores({
      plants: 'id, name, createdAt, bedId',
      beds: 'id, name, createdAt',
    })
    await legacy.open()
    await legacy.table('beds').add({
      id: 'bed1',
      name: 'Old bed',
      color: 1,
      x: 0,
      y: 0,
      w: 160,
      h: 120,
      createdAt: 1,
    })
    await legacy.table('plants').bulkAdd([
      {
        id: 'p1',
        name: 'Old Plum',
        variety: 'Victoria',
        location: 'row 2',
        bedId: 'bed1',
        createdAt: 1,
      },
      { id: 'p2', name: 'Bramley 20', createdAt: 2 },
    ])
    await legacy.table('observations').add({
      id: 'o1',
      plantId: 'p1',
      timestamp: 1,
      parts: ['fruit'],
      conditions: ['healthy'],
      treatments: [],
      createdAt: 1,
    })
    legacy.close()

    const upgraded = new PomonaDB(name)
    await upgraded.open()

    const plant = await upgraded.plants.get('p1')
    expect(plant && 'name' in plant).toBe(false)
    expect(plant?.variety).toBe('Old Plum')
    expect(plant?.species).toBeUndefined()
    expect(plant && 'bedId' in plant).toBe(false)

    const plant2 = await upgraded.plants.get('p2')
    expect(plant2?.variety).toBe('Bramley 20')
    expect(plant2 && 'name' in plant2).toBe(false)

    expect(upgraded.tables.map((t) => t.name)).not.toContain('beds')
    expect(await upgraded.locations.count()).toBe(0)

    const obs = await upgraded.observations.get('o1')
    expect(obs?.parts).toEqual(['fruit'])

    upgraded.close()
  })

  it('leaves records that already have no name untouched', async () => {
    const name = 'pomona-name-idempotent-test'
    const first = new PomonaDB(name)
    await first.open()
    await first.plants.add({
      id: 'ip1',
      species: 'Plum',
      variety: 'Keep me',
      createdAt: Date.now(),
    })
    first.close()

    const second = new PomonaDB(name)
    await second.open()
    const plant = await second.plants.get('ip1')
    expect(plant?.variety).toBe('Keep me')
    expect(plant?.species).toBe('Plum')
    second.close()
  })
})

describe('location CRUD', () => {
  it('stores locations with optional image reference', async () => {
    const id = newId()
    await db.locations.add({ id, name: 'Back garden', color: 2, createdAt: Date.now() })
    const loc = await db.locations.get(id)
    expect(loc?.name).toBe('Back garden')
    expect(loc?.imagePhotoId).toBeUndefined()
    await db.locations.delete(id)
  })
})

describe('location deletion', () => {
  it('unassigns plants and clears pins', async () => {
    const locationId = newId()
    const plantId = newId()
    await db.locations.add({
      id: locationId,
      name: 'Doomed location',
      color: 0,
      createdAt: Date.now(),
    })
    await db.plants.add({
      id: plantId,
      species: 'Plum',
      locationId,
      pinX: 0.5,
      pinY: 0.5,
      createdAt: Date.now(),
    })

    await db.transaction('rw', db.locations, db.plants, async () => {
      await db.plants.where('locationId').equals(locationId).modify((plant) => {
        delete plant.locationId
        delete plant.pinX
        delete plant.pinY
      })
      await db.locations.delete(locationId)
    })

    const plant = await db.plants.get(plantId)
    expect(plant?.species).toBe('Plum')
    expect(plant?.locationId).toBeUndefined()
    expect(plant?.pinX).toBeUndefined()
    expect(plant?.pinY).toBeUndefined()
    expect(await db.locations.get(locationId)).toBeUndefined()

    await db.plants.delete(plantId)
  })
})
