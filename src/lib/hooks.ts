import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'

export function useLiveQuery<T>(
  querier: () => Promise<T | undefined> | T | undefined,
  deps: readonly unknown[],
): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined)
  useEffect(() => {
    let alive = true
    const sub = liveQuery(querier).subscribe({
      next: (v) => {
        if (alive) setValue(v)
      },
      error: (err) => console.error('liveQuery error', err),
    })
    return () => {
      alive = false
      sub.unsubscribe()
    }
  }, deps)
  return value
}

export function useObjectUrl(blob?: Blob | null): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}
