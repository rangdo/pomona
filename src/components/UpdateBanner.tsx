import { useState, useSyncExternalStore } from 'react'
import { applyUpdate, hasUpdate, subscribe } from '../lib/update'
import { XIcon } from './icons'

export function UpdateBanner() {
  const available = useSyncExternalStore(subscribe, hasUpdate, () => false)
  const [dismissed, setDismissed] = useState(false)
  if (!available || dismissed) return null
  return (
    <div className="fixed inset-x-4 top-4 z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-stone-700 bg-stone-800 px-4 py-3 text-white shadow-xl">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Update available</p>
        <p className="text-xs text-stone-300">Save what you're doing first — the app will reload.</p>
      </div>
      <button
        type="button"
        onClick={() => void applyUpdate()}
        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-800 active:bg-stone-200"
      >
        Reload
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="flex size-8 items-center justify-center rounded-full text-stone-400 active:bg-stone-700"
      >
        <XIcon size={16} />
      </button>
    </div>
  )
}
