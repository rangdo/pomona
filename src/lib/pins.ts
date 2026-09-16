export function clampPin(v: number): number {
  return Math.min(1, Math.max(0, v))
}

export function isPlaced(plant: { pinX?: number; pinY?: number }): boolean {
  return typeof plant.pinX === 'number' && typeof plant.pinY === 'number'
}
