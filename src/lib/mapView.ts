export const MIN_SCALE = 1
export const MAX_SCALE = 4

export interface MapView {
  s: number
  tx: number
  ty: number
}

export function clampView(
  v: MapView,
  lw: number,
  lh: number,
  vw: number,
  vh: number,
): MapView {
  const w = lw * v.s
  const h = lh * v.s
  const tx = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, v.tx))
  const ty = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, v.ty))
  return { s: v.s, tx, ty }
}

export function zoomAt(
  v: MapView,
  cx: number,
  cy: number,
  factor: number,
  lw: number,
  lh: number,
  vw: number,
  vh: number,
): MapView {
  const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.s * factor))
  const fx = (cx - v.tx) / v.s
  const fy = (cy - v.ty) / v.s
  return clampView({ s, tx: cx - fx * s, ty: cy - fy * s }, lw, lh, vw, vh)
}
