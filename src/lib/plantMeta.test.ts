import { describe, expect, it } from 'vitest'
import {
  FRUITING_HABITS,
  MONTHS,
  POLLINATION_OPTIONS,
  SPECIES,
  SPECIES_GROUPS,
  harvestLabel,
  plantLabel,
} from './plantMeta'

describe('plantLabel', () => {
  it('combines species and variety', () => {
    expect(plantLabel({ species: 'Apple', variety: 'Bramley' })).toBe('Apple · Bramley')
  })

  it('falls back to species or variety alone', () => {
    expect(plantLabel({ species: 'Plum' })).toBe('Plum')
    expect(plantLabel({ species: '', variety: 'Victoria' })).toBe('Victoria')
  })

  it('shows Unknown plant when nothing is set', () => {
    expect(plantLabel({ species: '', variety: undefined })).toBe('Unknown plant')
  })
})

describe('harvestLabel', () => {
  it('formats a month range', () => {
    expect(harvestLabel({ harvestStart: 4, harvestEnd: 5 })).toBe('May – June')
  })

  it('is undefined unless both months are set', () => {
    expect(harvestLabel({ harvestStart: 4 })).toBeUndefined()
    expect(harvestLabel({ harvestStart: undefined, harvestEnd: 5 })).toBeUndefined()
  })
})

describe('species picker data', () => {
  it('has months in calendar order', () => {
    expect(MONTHS[0]).toBe('January')
    expect(MONTHS[11]).toBe('December')
    expect(MONTHS).toHaveLength(12)
  })

  it('groups species with no duplicates', () => {
    expect(SPECIES_GROUPS.length).toBeGreaterThanOrEqual(7)
    const flat = SPECIES_GROUPS.flatMap((g) => g.species)
    expect(new Set(flat).size).toBe(flat.length)
    expect(SPECIES).toEqual(flat)
  })

  it('covers the classic garden groups and key options', () => {
    expect(SPECIES).toContain('Apple')
    expect(SPECIES).toContain('Plum')
    expect(SPECIES).toContain('Lemon')
    expect(SPECIES).toContain('Strawberry')
    expect(SPECIES).toContain('Grape')
    expect(POLLINATION_OPTIONS).toContain('Self-fertile')
    expect(FRUITING_HABITS).toContain('Spur bearing')
    expect(FRUITING_HABITS).toContain('Tip bearing')
  })
})
