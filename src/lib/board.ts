export const BOARD_W = 1200
export const BOARD_H = 900
export const CELL = 40
export const COLS = BOARD_W / CELL
export const ROWS = BOARD_H / CELL

export interface SizePreset {
  key: 'S' | 'M' | 'L'
  label: string
  wCells: number
  hCells: number
}

export const SIZE_PRESETS: SizePreset[] = [
  { key: 'S', label: 'Small 2×2', wCells: 2, hCells: 2 },
  { key: 'M', label: 'Medium 4×3', wCells: 4, hCells: 3 },
  { key: 'L', label: 'Large 6×4', wCells: 6, hCells: 4 },
]

export function sizeKeyOf(w: number, h: number): 'S' | 'M' | 'L' {
  const match = SIZE_PRESETS.find(
    (p) => p.wCells * CELL === w && p.hCells * CELL === h,
  )
  return match?.key ?? 'M'
}

export const BED_COLORS: string[] = [
  'bg-lime-100 border-lime-300 text-lime-900',
  'bg-amber-100 border-amber-300 text-amber-900',
  'bg-sky-100 border-sky-300 text-sky-900',
  'bg-rose-100 border-rose-300 text-rose-900',
  'bg-emerald-100 border-emerald-300 text-emerald-900',
  'bg-orange-100 border-orange-300 text-orange-900',
  'bg-violet-100 border-violet-300 text-violet-900',
  'bg-stone-100 border-stone-300 text-stone-800',
]

export interface BedRect {
  x: number
  y: number
  w: number
  h: number
}

export function defaultPlacement(
  wCells: number,
  hCells: number,
  beds: BedRect[],
): { x: number; y: number } {
  const w = wCells * CELL
  const h = hCells * CELL
  const overlaps = (cx: number, cy: number) =>
    beds.some(
      (b) => cx < b.x + b.w && cx + w > b.x && cy < b.y + b.h && cy + h > b.y,
    )
  for (let cy = 0; cy + hCells <= ROWS; cy++) {
    for (let cx = 0; cx + wCells <= COLS; cx++) {
      if (!overlaps(cx * CELL, cy * CELL)) return { x: cx * CELL, y: cy * CELL }
    }
  }
  return { x: 0, y: 0 }
}

export function clampPos(x: number, y: number, w: number, h: number): { x: number; y: number } {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, BOARD_W - w)),
    y: Math.min(Math.max(0, y), Math.max(0, BOARD_H - h)),
  }
}

export function snap(v: number): number {
  return Math.round(v / CELL) * CELL
}
