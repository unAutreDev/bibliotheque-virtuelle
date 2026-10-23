import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Cover } from '../components/Cover'
import { GenreField } from '../components/GenreField'
import { Header } from '../components/Header'
import { OnlineSearch } from '../components/OnlineSearch'
import { HeartRating } from '../components/HeartRating'
import { SuggestionChips } from '../components/SuggestionChips'
import {
  addReading,
  db,
  STATUS_LABELS,
  TYPE_LABELS,
  updateReading,
  type Reading,
  type ReadingDraft,
  type ReadingStatus,
  type ReadingType,
} from '../lib/db'
import { findCover, resultToDraft, searchBooks, type BookResult } from '../lib/bookSearch'
import { isPhoto, photoToCover } from '../lib/image'
import { readIsbn } from '../lib/recognize'
import { buildSuggestions } from '../lib/suggestions'

const EMPTY: ReadingDraft = { type: 'livre', title: '', authors: [], status: 'a_lire' }

export function ReadingFormPage() {
  const { id } = useParams()
  const existing = useLiveQuery(() => (id ? db.readings.get(Number(id)) : undefined), [id])

  if (id && !existing) return null
  return <ReadingForm key={existing?.id ?? 'new'} existing={existing} />
}

function Field({ label, children, suggestions }: { label: string; children: ReactNode; suggestions?: ReactNode }) {
  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-600">{label}</span>
        {children}
      </label>
      {suggestions}
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-accent'

function ReadingForm({ existing }: { existing?: Reading }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<ReadingDraft>(existing ?? EMPTY)
  const [authorsText, setAuthorsText] = useState(existing?.authors.join(', ') ?? '')

  const [photoState, setPhotoState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [coverSearch, setCoverSearch] = useState<'idle' | 'loading' | 'notFound'>('idle')
  const [isbnScan, setIsbnScan] = useState<'idle' | 'loading' | 'notFound' | 'error'>('idle')
  const [ocrLines, setOcrLines] = useState<string[]>([])
  const [results, setResults] = useState<BookResult[]>([])
  const suggestions = useMemo(() => buildSuggestions(ocrLines, results), [ocrLines, results])

  const set = <K extends keyof ReadingDraft>(key: K, value: ReadingDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const text = (value: string) => value.trim() || undefined

  const pickResult = async (result: BookResult) => {
    const fields = await resultToDraft(result)
    // Une photo prise par l'utilisateur correspond à son édition : on la garde plutôt que l'image en ligne.
    setDraft((d) => ({ ...d, ...fields, coverUrl: isPhoto(d.coverUrl) ? d.coverUrl : (fields.coverUrl ?? d.coverUrl) }))
    if (fields.authors) setAuthorsText(fields.authors.join(', '))
    setCoverSearch('idle')
  }

  const prefill = (fields: Partial<ReadingDraft>) => {
    setDraft((d) => ({ ...d, ...fields }))
    if (fields.authors) setAuthorsText(fields.authors.join(', '))
  }

  const authorsList = authorsText.split(',').map((a) => a.trim()).filter(Boolean)
  const addAuthor = (author: string) => setAuthorsText([...authorsList, author].join(', '))

  const onSources = (sources: { ocrLines?: string[]; results?: BookResult[] }) => {
    if (sources.ocrLines) setOcrLines(sources.ocrLines)
    if (sources.results) setResults(sources.results)
  }

  /** Code-barres photographié depuis le champ ISBN : remplit l'ISBN, puis les champs encore vides. */
  const scanIsbn = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setIsbnScan('loading')
    try {
      const isbn = await readIsbn(file)
      if (!isbn) {
        setIsbnScan('notFound')
        return
      }
      set('isbn', isbn)
      setIsbnScan('idle')
      const { results: found } = await searchBooks(isbn, draft.type)
      setResults(found)
      const match = found.find((r) => r.isbn?.replace(/-/g, '') === isbn) ?? (found.length === 1 ? found[0] : undefined)
      if (!match) return
      const fields = await resultToDraft(match)
      setDraft((d) => {
        const filled = { ...d }
        for (const [key, value] of Object.entries(fields) as [keyof ReadingDraft, never][]) {
          const currentValue = d[key]
          const empty = currentValue === undefined || currentValue === '' || (Array.isArray(currentValue) && currentValue.length === 0)
          if (empty && key !== 'authors') filled[key] = value
        }
        return filled
      })
      if (fields.authors?.length && authorsList.length === 0) setAuthorsText(fields.authors.join(', '))
    } catch {
      setIsbnScan('error')
    }
  }

  const searchCover = async () => {
    setCoverSearch('loading')
    const authors = authorsText.split(',').map((a) => a.trim()).filter(Boolean)
    const coverUrl = await findCover({ ...draft, authors, isbn: text(draft.isbn ?? '') }).catch(() => undefined)
    if (coverUrl) set('coverUrl', coverUrl)
    setCoverSearch(coverUrl ? 'idle' : 'notFound')
  }

  const takePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoState('loading')
    try {
      set('coverUrl', await photoToCover(file))
      setCoverSearch('idle')
      setPhotoState('idle')
    } catch {
      setPhotoState('error')
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const clean: ReadingDraft = {
      ...draft,
      title: draft.title.trim(),
      series: text(draft.series ?? ''),
      authors: authorsText.split(',').map((a) => a.trim()).filter(Boolean),
      publishedDate: text(draft.publishedDate ?? ''),
      summary: text(draft.summary ?? ''),
      isbn: text(draft.isbn ?? ''),
      coverUrl: text(draft.coverUrl ?? ''),
      comment: text(draft.comment ?? ''),
      genres: draft.genres?.length ? draft.genres : undefined,
    }
    if (existing) {
      await updateReading(existing.id, clean)
      navigate(`/lecture/${existing.id}`, { replace: true })
    } else {
      const newId = await addReading(clean)
      navigate(`/lecture/${newId}`, { replace: true })
    }
  }

  return (
    <div className="min-h-dvh pb-10">
      <Header title={existing ? 'Modifier' : 'Ajouter une lecture'} back={existing ? `/lecture/${existing.id}` : '/'} />
      {/* Hors du formulaire principal : un <form> imbriqué n'est pas valide en HTML. */}
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-4">
        <div className="flex gap-2">
          {(Object.keys(TYPE_LABELS) as ReadingType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('type', t)}
              className={`flex-1 rounded-lg border py-2 ${draft.type === t ? 'border-accent bg-accent text-white' : 'border-stone-300 bg-white'}`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {!existing && <OnlineSearch type={draft.type} onPick={pickResult} onPrefill={prefill} onCoverPhoto={(cover) => set('coverUrl', cover)} onSources={onSources} />}
      </div>
      <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 p-4">
        {/* En premier : le code-barres au dos permet de remplir tout le reste. */}
        <div>
          <Field
            label="ISBN"
            suggestions={<SuggestionChips values={suggestions.isbn} current={[draft.isbn ?? '']} onPick={(v) => set('isbn', v)} />}
          >
            <input inputMode="numeric" value={draft.isbn ?? ''} onChange={(e) => set('isbn', e.target.value)} className={inputClass} />
          </Field>
          <label
            className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-accent px-3 py-2 text-sm text-accent active:scale-[0.98] ${isbnScan === 'loading' ? 'pointer-events-none opacity-60' : ''}`}
          >
            <span aria-hidden>📷</span>
            {isbnScan === 'loading' ? 'Lecture du code-barres…' : 'Lire le code-barres au dos'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={scanIsbn}
              aria-label="Photographier le code-barres"
              className="sr-only"
            />
          </label>
          {(isbnScan === 'notFound' || isbnScan === 'error') && (
            <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Je n'ai pas trouvé de code-barres sur cette photo. Cadre-le de plus près, bien à plat et sans reflet.
            </p>
          )}
        </div>

        <Field
          label="Titre *"
          suggestions={<SuggestionChips values={suggestions.title} current={[draft.title]} onPick={(v) => set('title', v)} />}
        >
          <input required value={draft.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
        </Field>

        <div className="flex gap-3">
          <div className="flex-1">
            <Field
              label="Série"
              suggestions={<SuggestionChips values={suggestions.series} current={[draft.series ?? '']} onPick={(v) => set('series', v)} />}
            >
              <input value={draft.series ?? ''} onChange={(e) => set('series', e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="w-24">
            <Field
              label="Tome"
              suggestions={
                <SuggestionChips values={suggestions.volume} current={[String(draft.volume ?? '')]} onPick={(v) => set('volume', Number(v))} />
              }
            >
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={draft.volume ?? ''}
                onChange={(e) => set('volume', e.target.value ? Number(e.target.value) : undefined)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <Field
          label="Auteur(s), séparés par des virgules"
          suggestions={<SuggestionChips values={suggestions.authors} current={authorsList} onPick={addAuthor} />}
        >
          <input value={authorsText} onChange={(e) => setAuthorsText(e.target.value)} className={inputClass} />
        </Field>

        <GenreField value={draft.genres ?? []} onChange={(genres) => set('genres', genres)} suggestions={suggestions.genres} />

        <Field
          label="Date de parution"
          suggestions={
            <SuggestionChips values={suggestions.publishedDate} current={[draft.publishedDate ?? '']} onPick={(v) => set('publishedDate', v)} />
          }
        >
          <input
            value={draft.publishedDate ?? ''}
            onChange={(e) => set('publishedDate', e.target.value)}
            placeholder="ex. 2003 ou 12/03/2003"
            className={inputClass}
          />
        </Field>

        <Field label="Résumé">
          <textarea rows={4} value={draft.summary ?? ''} onChange={(e) => set('summary', e.target.value)} className={inputClass} />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-stone-600">Couverture</span>
          <div className="flex items-start gap-3">
            <div className="w-24 shrink-0">
              <Cover url={text(draft.coverUrl ?? '')} title={draft.title || 'Sans titre'} type={draft.type} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-3 py-2 text-sm font-medium text-white active:scale-[0.98]">
                <span aria-hidden>📷</span>
                {photoState === 'loading' ? 'Traitement…' : 'Prendre en photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={takePhoto}
                  aria-label="Prendre la couverture en photo"
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={searchCover}
                disabled={!draft.title.trim() || coverSearch === 'loading'}
                className="w-full rounded-full border border-accent px-3 py-2 text-sm text-accent disabled:opacity-40"
              >
                {coverSearch === 'loading' ? 'Recherche…' : 'Chercher en ligne'}
              </button>
              {draft.coverUrl && (
                <button type="button" onClick={() => set('coverUrl', undefined)} className="w-full text-xs text-stone-500 underline">
                  Retirer la couverture
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {photoState === 'error'
              ? "Impossible de lire cette image. Essaie avec une autre photo."
              : coverSearch === 'notFound'
                ? 'Aucune couverture trouvée en ligne. Tu peux la prendre en photo.'
                : isPhoto(draft.coverUrl)
                  ? 'Photo enregistrée sur ton appareil.'
                  : 'Sans couverture, une image par défaut est affichée.'}
          </p>
          {!isPhoto(draft.coverUrl) && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-stone-500">Coller un lien d'image</summary>
              <input
                type="url"
                value={draft.coverUrl ?? ''}
                onChange={(e) => set('coverUrl', e.target.value)}
                placeholder="https://…"
                aria-label="Lien de la couverture"
                className={`${inputClass} mt-2`}
              />
            </details>
          )}
        </div>

        <Field label="Statut">
          <select value={draft.status} onChange={(e) => set('status', e.target.value as ReadingStatus)} className={inputClass}>
            {(Object.keys(STATUS_LABELS) as ReadingStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-stone-600">Ma note</span>
          <HeartRating value={draft.rating} onChange={(v) => set('rating', v)} size="lg" />
        </div>

        <Field label="Mon avis">
          <textarea rows={3} value={draft.comment ?? ''} onChange={(e) => set('comment', e.target.value)} className={inputClass} />
        </Field>

        <button type="submit" className="w-full rounded-full bg-accent py-3 font-semibold text-white active:scale-[0.99]">
          {existing ? 'Enregistrer' : 'Ajouter à ma bibliothèque'}
        </button>
      </form>
    </div>
  )
}
