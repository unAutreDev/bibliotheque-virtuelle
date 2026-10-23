import { normalize } from '../lib/search'

interface SuggestionChipsProps {
  values: (string | number)[]
  /** Valeur(s) déjà dans le champ, pour ne pas les reproposer. */
  current: string[]
  onPick: (value: string) => void
}

/** Petites pastilles sous un champ : toucher une suggestion la met dans le champ. */
export function SuggestionChips({ values, current, onPick }: SuggestionChipsProps) {
  const taken = new Set(current.map((value) => normalize(value)).filter(Boolean))
  const shown = values.map(String).filter((value) => !taken.has(normalize(value)))
  if (shown.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Suggestions">
      {shown.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onPick(value)}
          className="max-w-full truncate rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-xs text-accent active:scale-95"
        >
          {value}
        </button>
      ))}
    </div>
  )
}
