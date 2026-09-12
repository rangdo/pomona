import Dexie from 'dexie'
import { beforeAll, describe, expect, it } from 'vitest'
import { PomonaDB, db, type Bed } from './db'
import { newId } from '../lib/ids'
import { CELL, defaultPlacement } from '../lib/board'

beforeAll(async () => {
  await db.open()
})

describe('bed CRUD', () => {
  it('stores beds with board coordinates', async () => {
    const bed: Bed = {
      id: newId(),
      name: 'South bed',
      color: 2,
      x: 3 * CELL,
      y: 4 * CELL,
      w: 4 * CELL,
      h: 3 * CELL,
      createdAt: Date.now(),
    }
    await db.beds.add(bed)
    const read = await db.beds.get(bed.id)
    expect(read?.name).toBe('South bed')
    expect(read?.x).toBe(3 * CELL)
    await db.beds.delete(bed.id)
  })
})

describe('bed deletion', () => {
  it('leaves plants intact but unassigned', async () => {
    const bedId = newId()
    await db.beds.add({
      id: bedId,
      name: 'Doomed bed',
      color: 0,
      x: 0,
      y: 0,
      w: 4 * CELL,
      h: 3 * CELL,
      createdAt: Date.now(),
    })
    const plantId = newId()
    await db.plants.add({ id: plantId, name: 'Assigned plum', bedId, createdAt: Date.now() })

    await db.transaction('rw', db.beds, db.plants, async () => {
      await db.plants.where('bedId').equals(bedId).modify((plant) => {
        delete plant.bedId
      })
      await db.beds.delete(bedId)
    })

    const plant = await db.plants.get(plantId)
    expect(plant?.name).toBe('Assigned plum')
    expect(plant?.bedId).toBeUndefined()
    expect(await db.beds.get(bedId)).toBeUndefined()

    await db.plants.delete(plantId)
  })
})

describe('v1 → v2 migration', () => {
  it('upgrades an old database without touching existing records', async () => {
    const name = 'pomona-migration-test'
    const legacy = new Dexie(name)
    legacy.version(1).stores({
      plants: 'id, name, createdAt',
      observations: 'id, plantId, timestamp, [plantId+timestamp]',
      photos: 'id, takenAt',
      tags: 'id, category, [category+order]',
    })
    await legacy.open()
    const oldPlantId = newId()
    const oldObsId = newId()
    await legacy.table('plants').add({
      id: oldPlantId,
      name: 'Old Plum',
      variety: 'Victoria',
      location: 'row 2',
      createdAt: 1_700_000_000_000,
    })
    await legacy.table('observations').add({
      id: oldObsId,
      plantId: oldPlantId,
      timestamp: 1_700_000_000_000,
      parts: ['fruit'],
      conditions: ['healthy'],
      treatments: [],
      createdAt: 1_700_000_000_000,
    })
    legacy.close()

    const upgraded = new PomonaDB(name)
    await upgraded.open()

    const plant = await upgraded.plants.get(oldPlantId)
    expect(plant?.name).toBe('Old Plum')
    expect(plant?.variety).toBe('Victoria')
    expect(plant?.location).toBe('row 2')
    expect(plant?.bedId).toBeUndefined()

    const obs = await upgraded.observations.get(oldObsId)
    expect(obs?.parts).toEqual(['fruit'])

    expect(await upgraded.beds.count()).toBe(0)
    upgraded.close()
  })
})

describe('default placement integration', () => {
  it('fits beds onto the board without overlap', async () => {
    const existing: Array<{ x: number; y: number; w: number; h: number }> = []
    for (let i = 0; i < 5; i++) {
      const pos = defaultPlacement(4, 3, existing)
      expect(pos.x % CELL).toBe(0)
      expect(pos.y % CELL).toBe(0)
      existing.push({ x: pos.x, y: pos.y, w: 4 * CELL, h: 3 * CELL })
    }
    for (let i = 0; i < existing.length; i++) {
      for (let j = i + 1; j < existing.length; j++) {
        const a = existing[i]
        const b = existing[j]
        const overlap =
          a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
        expect(overlap).toBe(false)
      }
    }
  })
})
