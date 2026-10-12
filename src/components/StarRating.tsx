interface StarRatingProps {
  value?: number
  onChange?: (value: number | undefined) => void
  size?: 'sm' | 'lg'
}

/** Note sur 5. En mode éditable, toucher l'étoile déjà sélectionnée retire la note. */
export function StarRating({ value = 0, onChange, size = 'sm' }: StarRatingProps) {
  const textSize = size === 'lg' ? 'text-3xl' : 'text-sm'

  if (!onChange) {
    if (!value) return null
    return (
      <span className={`${textSize} text-amber-500`} aria-label={`Note : ${value} sur 5`}>
        {'★'.repeat(value)}
        <span className="text-stone-300">{'★'.repeat(5 - value)}</span>
      </span>
    )
  }

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Ma note">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
          onClick={() => onChange(value === star ? undefined : star)}
          className={`${textSize} leading-none transition-transform active:scale-90 ${star <= value ? 'text-amber-500' : 'text-stone-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
