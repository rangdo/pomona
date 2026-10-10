import type { Plant } from '../db/db'

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export const SPECIES = [
  'Apple',
  'Pear',
  'Plum',
  'Damson',
  'Gage',
  'Cherry',
  'Quince',
  'Medlar',
  'Mulberry',
  'Fig',
  'Peach',
  'Nectarine',
  'Apricot',
  'Almond',
  'Walnut',
  'Hazelnut',
  'Blackcurrant',
  'Redcurrant',
  'Whitecurrant',
  'Gooseberry',
  'Raspberry',
  'Blackberry',
  'Strawberry',
  'Grape',
  'Blueberry',
  'Other',
] as const

export const POLLINATION_OPTIONS = [
  'Self-fertile',
  'Partially self-fertile',
  'Needs a pollination partner',
  'Triploid — needs two partners',
] as const

export const FRUITING_HABITS = [
  'Spur bearing',
  'Tip bearing',
  'Both spur and tip',
] as const

export type PlantIdentity = Pick<Plant, 'species' | 'variety'>

export function plantLabel(plant: PlantIdentity): string {
  const species = plant.species?.trim()
  const variety = plant.variety?.trim()
  if (species && variety) return `${species} · ${variety}`
  if (species) return species
  if (variety) return variety
  return 'Unknown plant'
}

export function harvestLabel(plant: Pick<Plant, 'harvestStart' | 'harvestEnd'>): string | undefined {
  const start = plant.harvestStart
  const end = plant.harvestEnd
  if (start === undefined || end === undefined) return undefined
  if (start < 0 || start > 11 || end < 0 || end > 11) return undefined
  return `${MONTHS[start]} – ${MONTHS[end]}`
}
