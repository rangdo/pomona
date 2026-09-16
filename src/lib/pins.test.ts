import { describe, expect, it } from 'vitest'
import { clampPin, isPlaced } from './pins'

describe('clampPin', () => {
  it('clamps pin coordinates to 0..1', () => {
    expect(clampPin(-0.2)).toBe(0)
    expect(clampPin(0)).toBe(0)
    expect(clampPin(0.5)).toBe(0.5)
    expect(clampPin(1)).toBe(1)
    expect(clampPin(1.3)).toBe(1)
  })
})

describe('isPlaced', () => {
  it('requires both pin coordinates', () => {
    expect(isPlaced({ pinX: 0.5, pinY: 0.5 })).toBe(true)
    expect(isPlaced({ pinX: 0, pinY: 0 })).toBe(true)
    expect(isPlaced({ pinX: 0.5 })).toBe(false)
    expect(isPlaced({})).toBe(false)
  })
})
