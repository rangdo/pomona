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

export const SPECIES_GROUPS: ReadonlyArray<{
  name: string
  blurb: string
  species: string[]
}> = [
  {
    name: 'Citrus Fruits',
    blurb:
      'Grown on flowering trees and shrubs with a thick rind and pulpy, segmented flesh rich in citric acid.',
    species: ['Orange', 'Lemon', 'Lime', 'Grapefruit', 'Mandarin', 'Kumquat', 'Yuzu'],
  },
  {
    name: 'Berries & Small Fruits',
    blurb:
      'Small, juicy, thin-skinned fruits growing on bushes, canes or vines.',
    species: [
      'Strawberry',
      'Blueberry',
      'Raspberry',
      'Blackberry',
      'Loganberry',
      'Tayberry',
      'Cranberry',
      'Gooseberry',
      'Blackcurrant',
      'Redcurrant',
      'Whitecurrant',
      'Mulberry',
    ],
  },
  {
    name: 'Stone Fruits (Drupes)',
    blurb:
      'Fleshy fruit surrounding a single hard stone (pit) containing the seed.',
    species: [
      'Peach',
      'Nectarine',
      'Apricot',
      'Plum',
      'Damson',
      'Gage',
      'Cherry',
      'Mango',
    ],
  },
  {
    name: 'Pome Fruits',
    blurb:
      'Fruits with a central core of small seeds surrounded by crisp flesh.',
    species: ['Apple', 'Pear', 'Nashi (Asian Pear)', 'Quince', 'Medlar'],
  },
  {
    name: 'Melons & Vine Fruits (Cucurbits)',
    blurb:
      'Large fruits with thick rinds and sweet flesh growing on trailing vines.',
    species: ['Melon', 'Watermelon', 'Cantaloupe (Rockmelon)', 'Honeydew', 'Galia'],
  },
  {
    name: 'Tropical & Subtropical Fruits',
    blurb:
      'Fruits from warm climates, often with bold flavours and distinctive rinds or skins.',
    species: [
      'Pineapple',
      'Banana',
      'Papaya (Pawpaw)',
      'Passionfruit',
      'Dragonfruit',
      'Lychee',
      'Guava',
      'Fig',
      'Olive',
    ],
  },
  {
    name: 'Vine / Trellis Fruits',
    blurb: 'Fruits produced on climbing vines.',
    species: ['Grape', 'Kiwi (Kiwifruit)'],
  },
  {
    name: 'Nuts & Other',
    blurb: 'Everything else — including trees grown for their nuts.',
    species: ['Almond', 'Walnut', 'Hazelnut', 'Other'],
  },
]

export const SPECIES: string[] = [
  ...new Set(SPECIES_GROUPS.flatMap((group) => group.species)),
]

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
