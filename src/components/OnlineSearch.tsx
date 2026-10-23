import { useState, type ChangeEvent, type FormEvent } from 'react'
import { guessVolume, searchBooks, similarity, splitSeries, type BookResult } from '../lib/bookSearch'
import type { ReadingDraft, ReadingType } from '../lib/db'
import { photoToCover } from '../lib/image'
import { readCoverText, readIsbn } from '../lib/recognize'
import { tidyText } from '../lib/suggestions'

interface OnlineSearchProps {
  type: ReadingType
  onPick: (result: BookResult) => Promise<void>
  /** Champs lus directement sur la photo, appliqués avant même la recherche en ligne. */
  onPrefill: (fields: Partial<ReadingDraft>) => void
  /** Photo de la couverture reconnue, à garder comme couverture de la lecture. */
  onCoverPhoto: (dataUrl: string) => void
  /** Texte lu sur la photo et résultats trouvés, pour les suggestions sous chaque champ. */
  onSources: (sources: { ocrLines?: string[]; results?: BookResult[] }) => void
}

type Recognition = { step: 'idle' } | { step: 'barcode' } | { step: 'text'; progress: number } | { step: 'failed'; message: string }

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; results: BookResult[]; failed: boolean }

/** Seuil à partir duquel un résultat est assez proche du titre lu pour remplir la fiche sans demander. */
const AUTO_PICK_SIMILARITY = 0.6

/** Recherche en ligne : l'utilisateur tape un titre, un auteur ou un ISBN et choisit le bon résultat. */
export function OnlineSearch({ type, onPick, onPrefill, onCoverPhoto, onSources }: OnlineSearchProps) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [picking, setPicking] = useState<string>()
  const [autoPicked, setAutoPicked] = useState<BookResult>()
  const [recognition, setRecognition] = useState<Recognition>({ step: 'idle' })

  const runSearch = async (text: string): Promise<BookResult[]> => {
    if (!text.trim()) return []
    setAutoPicked(undefined)
    setState({ kind: 'loading' })
    const { results, failed } = await searchBooks(text.trim(), type)
    setState({ kind: 'done', results, failed })
    onSources({ results })
    return results
  }

  const search = (event: FormEvent) => {
    event.preventDefault()
    void runSearch(query)
  }

  /** Remplit la fiche avec un résultat sûr, en laissant la liste visible pour corriger si besoin. */
  const autoPick = async (result: BookResult) => {
    setPicking(result.id)
    await onPick(result)
    setPicking(undefined)
    setAutoPicked(result)
  }

  /**
   * Reconnaissance depuis une photo : d'abord le code-barres (4e de couverture, le plus fiable),
   * sinon le texte de la couverture. Ce qui est lu remplit la fiche tout de suite, puis la
   * recherche en ligne complète le reste quand un résultat correspond clairement.
   */
  const recognizePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setState({ kind: 'idle' })
    setAutoPicked(undefined)
    try {
      setRecognition({ step: 'barcode' })
      const isbn = await readIsbn(file).catch(() => undefined)
      if (isbn) {
        setRecognition({ step: 'idle' })
        onPrefill({ isbn })
        setQuery(isbn)
        const results = await runSearch(isbn)
        const match = results.find((r) => r.isbn?.replace(/-/g, '') === isbn) ?? (results.length === 1 ? results[0] : undefined)
        if (match) await autoPick(match)
        return
      }

      // Pas de code-barres : c'est sans doute la couverture, on la garde et on lit le texte.
      const cover = await photoToCover(file)
      onCoverPhoto(cover)
      setRecognition({ step: 'text', progress: 0 })
      const { title, fullText, lines } = await readCoverText(cover, (progress) => setRecognition({ step: 'text', progress }))
      onSources({ ocrLines: lines })
      if (!title) {
        setRecognition({
          step: 'failed',
          message:
            "Je n'ai pas réussi à lire le titre. La photo est gardée comme couverture : tape le titre, ou touche une suggestion sous les champs.",
        })
        return
      }
      setRecognition({ step: 'idle' })
      const split = splitSeries(tidyText(title))
      const volume = split.volume ?? guessVolume(fullText)
      onPrefill({ title: split.title, ...(split.series && { series: split.series }), ...(volume !== undefined && { volume }) })
      setQuery(title)
      const results = await runSearch(title)
      const best = results
        .map((result) => ({ result, score: similarity(result.title, title) }))
        .sort((a, b) => b.score - a.score)[0]
      if (best && best.score >= AUTO_PICK_SIMILARITY) await autoPick(best.result)
    } catch {
      setRecognition({ step: 'failed', message: "La reconnaissance n'a pas fonctionné. Réessaie avec une photo plus nette, ou tape le titre." })
    }
  }

  const recognizing = recognition.step === 'barcode' || recognition.step === 'text'

  const pick = async (result: BookResult) => {
    setPicking(result.id)
    await onPick(result)
    setPicking(undefined)
    setAutoPicked(undefined)
    setState({ kind: 'idle' })
  }

  return (
    <section className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
      <form onSubmit={search} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Titre, auteur ou ISBN"
          aria-label="Rechercher en ligne"
          enterKeyHint="search"
          className="min-w-0 flex-1 rounded-full border border-stone-300 px-4 py-2 outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={state.kind === 'loading'}
          className="shrink-0 rounded-full bg-accent px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {state.kind === 'loading' ? '…' : 'Chercher'}
        </button>
      </form>
      <label
        className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-accent px-3 py-2 text-sm font-medium text-accent active:scale-[0.98] ${recognizing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <span aria-hidden>📷</span>
        {recognition.step === 'barcode'
          ? 'Lecture du code-barres…'
          : recognition.step === 'text'
            ? `Lecture du titre… ${Math.round(recognition.progress * 100)} %`
            : 'Reconnaître avec une photo'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={recognizing}
          onChange={recognizePhoto}
          aria-label="Reconnaître le livre avec une photo"
          className="sr-only"
        />
      </label>
      {recognition.step === 'failed' && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{recognition.message}</p>}
      <p className="mt-2 px-1 text-xs text-stone-500">
        Photographie la couverture : ce qui est lu remplit la fiche, et des suggestions apparaissent sous chaque champ. Touche un résultat pour remplir la
        fiche, ou remplis-la à la main ci-dessous.
      </p>

      {autoPicked && (
        <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
          ✓ Fiche remplie avec « {autoPicked.title} » ({autoPicked.source}). Vérifie-la ci-dessous ; si ce n'est pas le bon
          livre, choisis un autre résultat.
        </p>
      )}
      {state.kind === 'done' && state.failed && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          La recherche en ligne n'a pas répondu. Vérifie ta connexion, ou remplis la fiche à la main.
        </p>
      )}
      {state.kind === 'done' && !state.failed && state.results.length === 0 && (
        <p className="mt-3 p-1 text-sm text-stone-600">Aucun résultat. Essaie avec moins de mots, ou remplis la fiche à la main.</p>
      )}
      {state.kind === 'done' && state.results.length > 0 && (
        <ul className="mt-3 max-h-[60vh] divide-y divide-stone-100 overflow-y-auto">
          {state.results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                disabled={picking !== undefined}
                onClick={() => pick(result)}
                className={`flex w-full gap-3 rounded-lg py-2 text-left active:bg-stone-50 disabled:opacity-60 ${autoPicked?.id === result.id ? 'bg-emerald-50 px-2 ring-1 ring-emerald-200' : ''}`}
              >
                <div className="flex aspect-[2/3] w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-stone-100 text-lg">
                  {result.coverUrl ? (
                    <img
                      src={result.coverUrl}
                      alt=""
                      loading="lazy"
                      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span aria-hidden>📕</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium leading-tight">{result.title}</p>
                  <p className="truncate text-sm text-stone-500">
                    {[result.authors.join(', '), result.publishedDate?.match(/\d{4}/)?.[0]].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-stone-400">
                    {picking === result.id ? 'Chargement…' : result.source}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
