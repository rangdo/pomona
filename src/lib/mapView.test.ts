import { describe, expect, it } from 'vitest'
import { MAX_SCALE, MIN_SCALE, clampView, zoomAt } from './mapView'

describe('clampView', () => {
  it('centers a map smaller than the viewport', () => {
    const v = clampView({ s: 1, tx: 0, ty: 0 }, 400, 300, 800, 600)
    expect(v.tx).toBe(200)
    expect(v.ty).toBe(150)
  })

  it('clamps a map larger than the viewport to its edges', () => {
    const v = clampView({ s: 1, tx: -800, ty: 50 }, 1000, 1000, 500, 500)
    expect(v.tx).toBe(-500)
    expect(v.ty).toBe(0)
  })
})

describe('zoomAt', () => {
  const big = { lw: 800, lh: 800, vw: 400, vh: 400 }

  it('keeps the focal point fixed on screen', () => {
    const start = { s: 1, tx: 0, ty: 0 }
    const v = zoomAt(start, 200, 200, 2, big.lw, big.lh, big.vw, big.vh)
    expect(v.s).toBe(2)
    const screenX = 200 * v.s + v.tx
    const screenY = 200 * v.s + v.ty
    expect(screenX).toBeCloseTo(200)
    expect(screenY).toBeCloseTo(200)
  })

  it('clamps at the scale limits', () => {
    const start = { s: MAX_SCALE, tx: 0, ty: 0 }
    const zoomedIn = zoomAt(start, 200, 200, 2, big.lw, big.lh, big.vw, big.vh)
    expect(zoomedIn.s).toBe(MAX_SCALE)

    const zoomedOut = zoomAt({ s: MIN_SCALE, tx: 0, ty: 0 }, 200, 200, 0.5, big.lw, big.lh, big.vw, big.vh)
    expect(zoomedOut.s).toBe(MIN_SCALE)
  })

  it('zooming out recenters a fully visible map', () => {
    const v = zoomAt({ s: 1, tx: 0, ty: 0 }, 100, 100, 0.5, 400, 300, 800, 600)
    expect(v.s).toBe(MIN_SCALE)
    expect(v.tx).toBe(200)
    expect(v.ty).toBe(150)
  })
})
