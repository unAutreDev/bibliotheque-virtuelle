interface HeartRatingProps {
  value?: number
  onChange?: (value: number | undefined) => void
  size?: 'sm' | 'lg'
}

// Cœur en SVG plutôt que le caractère ♥, que iOS affiche parfois en emoji rouge non stylable.
function Heart({ filled, className }: { filled: boolean; className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`${className} ${filled ? 'text-coral' : 'text-stone-300'}`}>
      <path
        fill="currentColor"
        d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2.1 4 6.3 4c2.3 0 3.8 1.3 4.7 2.6C11.9 5.3 13.4 4 15.7 4c4.2 0 6 4.4 4.3 7.7C19.5 16.4 12 21 12 21z"
      />
    </svg>
  )
}

/** Note sur 5 en cœurs. En mode éditable, toucher le cœur déjà sélectionné retire la note. */
export function HeartRating({ value = 0, onChange, size = 'sm' }: HeartRatingProps) {
  const iconSize = size === 'lg' ? 'h-8 w-8' : 'h-3.5 w-3.5'

  if (!onChange) {
    if (!value) return null
    return (
      <span className="inline-flex gap-px align-middle" role="img" aria-label={`Note : ${value} sur 5`}>
        {[1, 2, 3, 4, 5].map((heart) => (
          <Heart key={heart} filled={heart <= value} className={iconSize} />
        ))}
      </span>
    )
  }

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Ma note">
      {[1, 2, 3, 4, 5].map((heart) => (
        <button
          key={heart}
          type="button"
          role="radio"
          aria-checked={value === heart}
          aria-label={`${heart} cœur${heart > 1 ? 's' : ''}`}
          onClick={() => onChange(value === heart ? undefined : heart)}
          className="transition-transform active:scale-90"
        >
          <Heart filled={heart <= value} className={iconSize} />
        </button>
      ))}
    </div>
  )
}
