import { useState, type KeyboardEvent } from 'react'
import { addGenre, COMMON_GENRES } from '../lib/genres'
import { SuggestionChips } from './SuggestionChips'

interface GenreFieldProps {
  value: string[]
  onChange: (genres: string[]) => void
  /** Genres trouvés en ligne pour cette lecture, proposés en premier. */
  suggestions: string[]
}

/** Un ou plusieurs genres : pastilles à retirer, suggestions à toucher, ou saisie libre. */
export function GenreField({ value, onChange, suggestions }: GenreFieldProps) {
  const [typed, setTyped] = useState('')

  const add = (genre: string) => onChange(addGenre(value, genre))
  const addTyped = () => {
    // Plusieurs genres peuvent être tapés d'un coup, séparés par des virgules.
    onChange(typed.split(',').reduce(addGenre, value))
    setTyped('')
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addTyped()
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-stone-600">Genre(s)</span>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => onChange(value.filter((g) => g !== genre))}
              aria-label={`Retirer le genre ${genre}`}
              className="flex items-center gap-1 rounded-full bg-accent py-1 pr-2 pl-3 text-sm text-white"
            >
              {genre}
              <span aria-hidden className="text-base leading-none">
                ×
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="ex. Science-fiction"
          aria-label="Ajouter un genre"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={addTyped}
          disabled={!typed.trim()}
          className="rounded-lg border border-accent px-3 text-sm text-accent disabled:opacity-40"
        >
          Ajouter
        </button>
      </div>
      <SuggestionChips values={suggestions} current={value} onPick={add} />
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-stone-500">Genres courants</summary>
        <SuggestionChips values={COMMON_GENRES} current={value} onPick={add} />
      </details>
    </div>
  )
}
