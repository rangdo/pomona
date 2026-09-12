import { describe, expect, it } from 'vitest'
import {
  fmtWeight,
  formatDate,
  formatTime,
  monthKey,
  monthLabel,
  relTime,
} from './time'

describe('fmtWeight', () => {
  it('keeps grams under 1000', () => {
    expect(fmtWeight(0)).toBe('0 g')
    expect(fmtWeight(999)).toBe('999 g')
  })
  it('converts to kg at 1000 and above', () => {
    expect(fmtWeight(1000)).toBe('1.00 kg')
    expect(fmtWeight(2500)).toBe('2.50 kg')
  })
})

describe('monthKey / monthLabel', () => {
  it('builds a zero-padded key from a timestamp', () => {
    const ts = new Date(2026, 2, 9, 12, 0).getTime()
    expect(monthKey(ts)).toBe('2026-03')
  })
  it('round-trips key back to a label', () => {
    expect(monthLabel('2026-03')).toMatch(/March\s*2026/)
  })
})

describe('relTime', () => {
  it('reports seconds as just now', () => {
    expect(relTime(Date.now() - 30_000)).toBe('just now')
  })
  it('reports minutes and hours', () => {
    expect(relTime(Date.now() - 5 * 60_000)).toBe('5m ago')
    expect(relTime(Date.now() - 3 * 3_600_000)).toBe('3h ago')
  })
  it('falls back to a formatted date after a week', () => {
    const ts = Date.now() - 8 * 24 * 3_600_000
    expect(relTime(ts)).toBe(formatDate(ts))
  })
})

describe('formatTime', () => {
  it('renders hour and minute', () => {
    const ts = new Date(2026, 0, 1, 9, 5).getTime()
    expect(formatTime(ts)).toMatch(/09[:.]?\s?05|9[:.]?\s?05/)
  })
})
