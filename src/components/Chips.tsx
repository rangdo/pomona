import type { TagCategory } from '../db/db'

export const chipColors: Record<TagCategory, string> = {
  part: 'border-sky-200 bg-sky-100 text-sky-800',
  condition: 'border-amber-200 bg-amber-100 text-amber-800',
  treatment: 'border-emerald-200 bg-emerald-100 text-emerald-800',
}

export function ChipLabel({ category, label }: { category: TagCategory; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${chipColors[category]}`}
    >
      {label}
    </span>
  )
}

export function ChipPicker({
  tags,
  selected,
  onToggle,
}: {
  tags: { label: string }[]
  selected: string[]
  onToggle: (label: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const on = selected.includes(tag.label)
        return (
          <button
            key={tag.label}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(tag.label)}
            className={`min-h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
              on
                ? 'border-lime-700 bg-lime-700 text-white'
                : 'border-stone-300 bg-white text-stone-700 active:bg-stone-200'
            }`}
          >
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}
