import { describe, expect, it } from 'vitest'
import {
  BOARD_H,
  BOARD_W,
  CELL,
  clampPos,
  defaultPlacement,
  snap,
} from './board'

describe('defaultPlacement', () => {
  it('places the first bed at the origin', () => {
    expect(defaultPlacement(4, 3, [])).toEqual({ x: 0, y: 0 })
  })

  it('places the next bed beside the first', () => {
    const placed = defaultPlacement(2, 2, [{ x: 0, y: 0, w: 2 * CELL, h: 2 * CELL }])
    expect(placed).toEqual({ x: 2 * CELL, y: 0 })
  })

  it('wraps to the next row when the row is full', () => {
    const rowBed = { x: 0, y: 0, w: BOARD_W, h: 2 * CELL }
    expect(defaultPlacement(2, 2, [rowBed])).toEqual({ x: 0, y: 2 * CELL })
  })

  it('handles arbitrary sizes beyond the old presets', () => {
    const placed = defaultPlacement(4, 4, [{ x: 0, y: 0, w: 4 * CELL, h: 4 * CELL }])
    expect(placed).toEqual({ x: 4 * CELL, y: 0 })
  })

  it('returns origin when the board is completely full', () => {
    expect(defaultPlacement(30, 22, [{ x: 0, y: 0, w: BOARD_W, h: BOARD_H }])).toEqual({
      x: 0,
      y: 0,
    })
  })
})

describe('clampPos', () => {
  it('keeps positions inside the board', () => {
    expect(clampPos(-10, -10, 160, 120)).toEqual({ x: 0, y: 0 })
    expect(clampPos(BOARD_W, BOARD_H, 160, 120)).toEqual({
      x: BOARD_W - 160,
      y: BOARD_H - 120,
    })
  })
  it('accepts in-range positions unchanged', () => {
    expect(clampPos(40, 80, 160, 120)).toEqual({ x: 40, y: 80 })
  })
})

describe('snap', () => {
  it('rounds to the nearest grid cell', () => {
    expect(snap(0)).toBe(0)
    expect(snap(19)).toBe(0)
    expect(snap(21)).toBe(CELL)
    expect(snap(60)).toBe(2 * CELL)
  })
})
