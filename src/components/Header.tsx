import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from './icons'

export function Header({
  title,
  subtitle,
  backTo,
  right,
}: {
  title: ReactNode
  subtitle?: string
  backTo?: string
  right?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-stone-200 bg-stone-100/95 px-2 py-3 backdrop-blur">
      {backTo && (
        <button
          type="button"
          onClick={() => navigate(backTo)}
          aria-label="Back"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-stone-500 active:bg-stone-200"
        >
          <ChevronLeftIcon />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-stone-500">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}
