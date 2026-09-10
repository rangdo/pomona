import { useState, useSyncExternalStore } from 'react'
import { canInstall, promptInstall, subscribe } from '../lib/install'
import { XIcon } from './icons'

export function InstallBanner() {
  const available = useSyncExternalStore(subscribe, canInstall, () => false)
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('pomona-install-dismissed') === '1',
  )
  if (!available || dismissed) return null
  return (
    <div className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-lime-900/40 bg-lime-900 px-4 py-3 text-white shadow-xl">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install Pomona</p>
        <p className="text-xs text-lime-200">Add to your home screen — works offline.</p>
      </div>
      <button
        type="button"
        onClick={() => void promptInstall()}
        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-lime-900 active:bg-lime-100"
      >
        Install
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          sessionStorage.setItem('pomona-install-dismissed', '1')
          setDismissed(true)
        }}
        className="flex size-8 items-center justify-center rounded-full text-lime-300 active:bg-lime-800"
      >
        <XIcon size={16} />
      </button>
    </div>
  )
}
