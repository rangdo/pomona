type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
let installed =
  typeof window !== 'undefined' &&
  window.matchMedia('(display-mode: standalone)').matches

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    emit()
  })
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function canInstall(): boolean {
  return !installed && deferred !== null
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return
  await deferred.prompt()
  const choice = await deferred.userChoice
  if (choice.outcome === 'accepted') installed = true
  deferred = null
  emit()
}
