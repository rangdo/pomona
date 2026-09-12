import Dexie, { type Table } from 'dexie'

export type TagCategory = 'part' | 'condition' | 'treatment'

export interface Plant {
  id: string
  name: string
  variety?: string
  species?: string
  plantedDate?: string
  location?: string
  bedId?: string
  photoId?: string
  createdAt: number
}

export interface Observation {
  id: string
  plantId: string
  timestamp: number
  parts: string[]
  conditions: string[]
  treatments: string[]
  fruitCount?: number
  weightG?: number
  note?: string
  gps?: { lat: number; lon: number }
  photoId?: string
  createdAt: number
}

export interface Photo {
  id: string
  blob: Blob
  thumb: Blob
  takenAt: number
  createdAt: number
}

export interface Tag {
  id: string
  category: TagCategory
  label: string
  order: number
  custom: 0 | 1
}

export interface Bed {
  id: string
  name: string
  color: number
  x: number
  y: number
  w: number
  h: number
  createdAt: number
}

export class PomonaDB extends Dexie {
  plants!: Table<Plant, string>
  observations!: Table<Observation, string>
  photos!: Table<Photo, string>
  tags!: Table<Tag, string>
  beds!: Table<Bed, string>

  constructor(name = 'pomona') {
    super(name)
    this.version(1).stores({
      plants: 'id, name, createdAt',
      observations: 'id, plantId, timestamp, [plantId+timestamp]',
      photos: 'id, takenAt',
      tags: 'id, category, [category+order]',
    })
    this.version(2).stores({
      plants: 'id, name, createdAt, bedId',
      beds: 'id, name, createdAt',
    })
  }
}

export const db = new PomonaDB()

const DEFAULT_TAGS: Record<TagCategory, string[]> = {
  part: ['whole plant', 'blossom', 'fruit', 'leaf', 'branch', 'trunk', 'bark', 'roots'],
  condition: [
    'healthy',
    'pest damage',
    'disease',
    'frost damage',
    'sunburn',
    'yellowing leaves',
    'wilting',
    'fruit drop',
  ],
  treatment: [
    'planted',
    'pruned',
    'fertilized',
    'sprayed',
    'watered',
    'mulched',
    'netted',
    'weeded',
    'harvested',
  ],
}

db.on('ready', async () => {
  if ((await db.tags.count()) === 0) {
    const tags: Tag[] = []
    for (const category of Object.keys(DEFAULT_TAGS) as TagCategory[]) {
      DEFAULT_TAGS[category].forEach((label, order) => {
        tags.push({ id: `${category}:${label}`, category, label, order, custom: 0 })
      })
    }
    await db.tags.bulkAdd(tags)
  }
})

export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist()
  } catch {
    // storage persistence unsupported on this browser; data still works normally
  }
}
