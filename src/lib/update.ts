import { registerSW } from 'virtual:pwa-register'

let needRefresh = false
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function startServiceWorker(): void {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true
      emit()
    },
  })
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function hasUpdate(): boolean {
  return needRefresh
}

export async function applyUpdate(): Promise<void> {
  await updateSW?.(true)
}
