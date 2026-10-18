import { useEffect, useState } from 'react'
import { SPECIES_GROUPS } from '../lib/plantMeta'
import { inputClass, labelClass } from './styles'

export function SpeciesPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (species: string) => void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function pick(species: string) {
    onChange(species)
    setOpen(false)
  }

  return (
    <>
      <span className={labelClass}>Species *</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${inputClass} flex items-center justify-between text-left`}
        aria-haspopup="dialog"
      >
        <span className={value ? '' : 'text-stone-400'}>
          {value || 'Choose species…'}
        </span>
        <ChevronDownIcon />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose species"
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white px-4 py-3">
              <h2 className="text-base font-bold text-stone-800">Choose species</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-10 rounded-full bg-lime-700 px-4 text-sm font-semibold text-white active:bg-lime-800"
              >
                Done
              </button>
            </header>
            <div className="space-y-5 p-4 pb-6">
              {SPECIES_GROUPS.map((group) => (
                <section key={group.name}>
                  <h3 className="text-sm font-bold text-stone-700">{group.name}</h3>
                  <p className="mt-0.5 mb-2 text-xs leading-snug text-stone-400">
                    {group.blurb}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.species.map((species) => {
                      const on = species === value
                      return (
                        <button
                          key={species}
                          type="button"
                          aria-pressed={on}
                          onClick={() => pick(species)}
                          className={`min-h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
                            on
                              ? 'border-lime-700 bg-lime-700 text-white'
                              : 'border-stone-300 bg-white text-stone-700 active:bg-stone-200'
                          }`}
                        >
                          {species}
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 shrink-0 text-stone-400"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
